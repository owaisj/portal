import angular from 'angular';

let designsafeDirectives = angular.module('designsafe.directives', []);

import { ddAltmetrics } from './dd-altmetrics';
import { ddBoxListing } from './dd-box-listing';
import { ddDropboxListing } from './dd-dropbox-listing';
import { ddGoogleDriveListing } from './dd-googledrive-listing';
import { ddProjectSearchListing } from './dd-project-search-listing';
import { ddPublicSearchListing } from './dd-public-search-listing';
import { ddSearchListing } from './dd-search-listing';
import { ddSharedListing } from './dd-shared-listing';
import { metadataListing } from './metadata-listing';
// import { myDataBrowser } from './my-data-browser';
import { fileModel, spinnerOnLoad, httpSrc, accessfiles,
         selectOnFocus, dsDataDraggable, dsDraggable, dsInfiniteScroll,
         dsUser, dsUserList, dsAuthorList, dsFixTop, yamzTerm, } from './ng-designsafe-directives';

designsafeDirectives.directive('ddAltmetrics', ['$sce', '$filter', ddAltmetrics]);
designsafeDirectives.directive('ddBoxListing', ddBoxListing);
designsafeDirectives.directive('ddDropboxListing', ddDropboxListing);
designsafeDirectives.directive('ddGoogleDriveListing', ddGoogleDriveListing);
designsafeDirectives.directive('ddProjectSearchListing', ddProjectSearchListing);
designsafeDirectives.directive('ddPublicSearchListing', ddPublicSearchListing);
designsafeDirectives.directive('ddSearchListing', ddSearchListing);
designsafeDirectives.directive('ddSharedListing', ddSharedListing);
designsafeDirectives.directive('metadataListing', metadataListing);
// designsafeDirectives.directive('myDataBrowser', myDataBrowser);

designsafeDirectives.directive('fileModel', fileModel);
designsafeDirectives.directive('spinnerOnLoad', spinnerOnLoad);
designsafeDirectives.directive('httpSrc', httpSrc);
designsafeDirectives.directive('accessfiles', accessfiles);
designsafeDirectives.directive('selectOnFocus', selectOnFocus);
designsafeDirectives.directive('dsDataDraggable', dsDataDraggable);
designsafeDirectives.directive('dsDraggable', dsDraggable);
designsafeDirectives.directive('dsInfiniteScroll', dsInfiniteScroll);
designsafeDirectives.directive('dsUser', dsUser);
designsafeDirectives.directive('dsUserList', dsUserList);
designsafeDirectives.directive('dsAuthorList', dsAuthorList);
designsafeDirectives.directive('dsFixTop', dsFixTop);
designsafeDirectives.directive('yamzTerm', yamzTerm);

export default designsafeDirectives;
