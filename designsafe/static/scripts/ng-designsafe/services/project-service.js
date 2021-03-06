import _ from 'underscore';
import { $IsStateFilter, $IncludedByStateFilter } from 'angular-ui-router/lib/stateFilters';
import experimentalData from "../../projects/components/manage-experiments/experimental-data.json";

export function ProjectService(httpi, $interpolate, $q, $state, $uibModal, Logging, ProjectModel, ProjectEntitiesService) {
    'ngInject';

    let logger = Logging.getLogger('DataDepot.ProjectService');

    let efs = experimentalData.experimentalFacility;
    let equipmentTypes = experimentalData.equipmentTypes;
    let experimentTypes = experimentalData.experimentTypes;

    let service = {};

    let projectResource = httpi.resource('/api/projects/:uuid/').setKeepTrailingSlash(true);
    let collabResource = httpi.resource('/api/projects/:uuid/collaborators/').setKeepTrailingSlash(true);
    let dataResource = httpi.resource('/api/projects/:uuid/data/:fileId').setKeepTrailingSlash(true);
    //var entitiesResource = httpi.resource('/api/projects/:uuid/meta/:name/').setKeepTrailingSlash(true);
    //var entityResource = httpi.resource('/api/projects/meta/:uuid/').setKeepTrailingSlash(true);

    service.data = {
        navItems: [],
        projects: [],
    };

    service.resolveParams = {
        projectId: null,
        filePath: null,
        projectTitle: null,
        query_string: null,
    };

    /**
     * Get a list of Projects for the current user
     * @param {Object} options - The offset and limit variables
     * @returns {Project[]}
     */
    service.list = function(options) {
        return projectResource.get({ params: options }).then(function(resp) {
            return _.map(resp.data.projects, function(p) { return new ProjectModel(p); });
        });
    };

    /**
     * Get a specific Project
     * @param {Object} options
     * @param {string} options.uuid The Project UUID
     * @returns {Promise}
     */
    service.get = function(options) {
        return projectResource.get({ params: options }).then(function(resp) {
            return new ProjectModel(resp.data);
        });
    };

    /**
     * Save or update a Project
     * @param {Object} options
     * @param {string} [options.uuid] The Project uuid, if updating existing record, otherwise null
     * @param {string} options.title The Project title
     * @param {string} [options.pi] The username for Project PI
     * @param {string[]} [options.coPis] List of usernames for Project Co-PIs
     * @returns {Promise}
     */
    service.save = function(options) {
        return projectResource.post({ data: options }).then(function(resp) {
            return new ProjectModel(resp.data);
        });
    };

    /**
     * Get a list of usernames for users that are collaborators on the Project
     * @param {Object} options
     * @param {string} options.uuid The Project uuid
     * @returns {Promise}
     */
    service.getCollaborators = function(options) {
        return collabResource.get({ params: options }).then(function(resp) {
            if (typeof resp.data.teamMembers !== 'undefined') {
                resp.data.teamMembers = _.without(resp.data.teamMembers, 'ds_admin', 'prjadmin');
            }
            return resp;
        });
    };

    /**
     *
     * @param options
     * @param {string} options.uuid The Project uuid
     * @param {string} options.username The username of the collaborator to add
     * @returns {Promise}
     */
    service.addCollaborator = function(options) {
        return collabResource.post({ data: options });
    };

    /**
     *
     * @param options
     * @param {string} options.uuid The Project uuid
     * @param {string} options.username The username of the collaborator to add
     * @returns {Promise}
     */
    service.removeCollaborator = function(options) {
        return collabResource.delete({ data: options });
    };

    /**
     *
     * @param options
     * @param {string} options.uuid The Project uuid
     * @param {string} [options.fileId] the Project data file id to list
     * @returns {Promise}
     */
    service.projectData = function(options) {
        return dataResource.get({ params: options });
    };

    /**
     *
     * @param {Project} project The Project
     * @param {ProjectEntity} selectedEntities The selected primary entities
     * @param {object} selections Object of file listings based on associated uuids
     * @returns {Message} Returns an error message for missing or incomplete entities
     */
    service.checkSelectedFiles = function(project, selectedEntities, selections) {
        let errMsg = {
            modelconfig_set: 'Model Configuration',
            sensorlist_set: 'Sensor Information',
            event_set: 'Event',
            model_set: 'Model',
            input_set: 'Input',
            output_set: 'Output',
            globalmodel_set: 'Global Model',
            coordinator_set: 'Coordinator',
            simsubstructure_set: 'Simulation Substructure',
            expsubstructure_set: 'Experimental Substructure',
            collection_set: 'Collection',
            analysis_set: 'Analysis',
            report_set: 'Report',

        };

        let requiredSets = [];
        let missingData = [];
        let requiresFiles = ['analysis_set', 'report_set']; // checks if files are provided if included....
        if (project.value.projectType === 'experimental') {
            requiredSets = ['modelconfig_set', 'sensorlist_set', 'event_set'];
        } else if (project.value.projectType === 'simulation') {
            requiredSets = ['model_set', 'input_set', 'output_set'];
        } else if (project.value.projectType === 'hybrid_simulation') {
            requiredSets = [
                'globalmodel_set',
                'coordinator_set',
                'simsubstructure_set',
                'expsubstructure_set',
            ];
        } else if (project.value.projectType === 'field_recon') {
            requiredSets = ['collection_set'];
        }

        selectedEntities.forEach((primEnt) => {
            let associatedEnts = [];
            requiredSets.forEach((set) => {
                project[set].forEach((subEnt) => {
                    if (subEnt.associationIds.includes(primEnt.uuid)) {
                        if (selections[subEnt.uuid]) {
                            associatedEnts.push(set);
                        }
                    }
                });
            });
            if (!requiredSets.every(set => associatedEnts.includes(set))){
                let missingSets = requiredSets.filter(set => !associatedEnts.includes(set));
                let missingNames = [];
                missingSets.forEach((set) => {
                    missingNames.push(errMsg[set]); 
                });
                missingData.push({
                    'title': primEnt.value.title,
                    'missing': missingNames
                });
            }
        });
        return missingData;
    };

    service.manageHybridSimulations = (options) => {
        $uibModal.open({
            component: 'manageHybridSimulations',
            resolve: {
                options: () => options,
            },
            size: 'lg',
        });
    };

    /**
     *
     * @param options
     * @param {string} options.uuid The Project uuid
     * @returns {Promise}
     */
    service.manageSimulations = (options) => {
        $uibModal.open({
            component: 'manageSimulations',
            resolve: {
                options: () => options,
            },
            size: 'lg',
        });
    };

    /**
     * @param {Project} [project]
     * @return {Promise}
     */
    service.editProject = (project) => {
        let modalInstance = $uibModal.open({
            component: 'editProject',
            resolve: {
                project: () => project,
                efs: () => efs,
            },
            size: 'lg',
        });
        return modalInstance;
    };


    return service;

}
