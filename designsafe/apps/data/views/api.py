from django.conf import settings
from django.shortcuts import render, render_to_response
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, StreamingHttpResponse
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
#from dsapi.agave.files import *
from agavepy.agave import Agave, AgaveException
from designsafe.apps.data.apps import DataEvent

from .base import BaseView
from dsapi.agave.daos import AgaveFolderFile, AgaveMetaFolderFile, AgaveFilesManager

import json
import logging
import requests
import traceback


logger = logging.getLogger(__name__)

class ListingsView(BaseView):
    
    def set_context_props(self, request, **kwargs):
        super(ListingsView, self).set_context_props(request, **kwargs)

    def get(self, request, *args, **kwargs):
        self.set_context_props(request, **kwargs)
        manager = AgaveFilesManager(self.agave_client)
        l = manager.list_meta_path(system_id = self.filesystem, 
                                    path = self.file_path)
        return self.render_to_json_response([o.as_json() for o in l])

class DownloadView(BaseView):

    def set_context_props(self, request, **kwargs):
        super(DownloadView, self).set_context_props(request, **kwargs)

    def get(self, request, *args, **kwargs):
        self.set_context_props(request, **kwargs)
        f = AgaveFolderFile.frompath(agave_client = self.agave_client,
                system_id = self.filesystem, 
                path = self.file_path,
                username = request.user.username)
        ds = self.download_stream(headers = {'Authorization': 'Bearer %s' % self.access_token})
        return StreamingHttpResponse(ds.content, content_type=f.mimetype, status=200)

class UploadView(BaseView):
    def post(self, request, *args, **kwargs):
        self.set_context_props(request, **kwargs)
        f = AgaveMetaFolderFile.from_file(agave_client = self.agave_client,
                f = request.FILES['file'],
                system_id = self.filesystem,
                path = self.file_path,
                username = request.user.username)
        f.upload_file(f, 
                      headers = {'Authorization': 'Bearer %s' % self.access_token})
        return self.render_to_json_response({'message': 'OK'})

class MetadataView(BaseView):
    def set_context_props(self, request, **kwargs):
        super(MetadataView, self).set_context_props(request, **kwargs)
        f = AgaveMetaFolderFile.from_path(
                agave_client = self.agave_client,
                system_id = self.filesystem,
                path = self.file_path,
                username = request.user.username)
        return f

    def get(request, *args, **kwargs):
        f = self.set_context_props(request, **kwargs)
        return self.render_to_jston_response(f.as_json())

    def post(request, *args, **kwargs):
        f = self.set_context_props(request, **kwargs)
        body = json.loads(request.body)
        meta = body.get('metadata', None)
        f = f.update(meta)
        return self.render_to_json_response(f.to_json())

@login_required
@require_http_methods(['GET'])
def meta_search(request):
    """
    Search metadata
    """
    token = request.session.get(getattr(settings, 'AGAVE_TOKEN_SESSION_ID'))
    access_token = token.get('access_token', None)
    url = getattr(settings, 'AGAVE_TENANT_BASEURL')
    filesystem = getattr(settings, 'AGAVE_STORAGE_SYSTEM')
    try:
        a = Agave(api_server = url, token = access_token)

        #TODO: Make it more intelligent by looking in the metadata schemas.
        #TODO: Probably should have a libr to create MongoDB-like queries from q string and schema.
        #TODO: Querying Agave metadata does not return file Permissions or file type. We could handle this in the frontend by caching this information. Too big?, or just add it to our metadata Schema.
        #TODO: How is this going to change once we have the Data Backend in place?
        #TODO: Agave just knows if it's a folder or something else, discuss...

        meta_qs = json.loads(request.GET.get('q'))
        logger.info('Meta_qs: {0}'.format(meta_qs))
        if 'all' in meta_qs:
            meta_q = {
                '$or': [
                    {'value.project': {'$regex': meta_qs['all'], '$options':'i'}},
                    {'value.author': {'$regex': meta_qs['all'], '$options':'i'}},
                    {'value.source': {'$regex': meta_qs['all'], '$options':'i'}},
                    {'value.key': {'$regex': meta_qs['all'], '$options':'i'}}
                ]
            }
        else:
            meta_q = {'$or': []}
            for key, value in meta_qs.items():
                meta_q['$or'].append({'value.%s' % key: {'$regex': value, '$options':'i'}})

        logger.info('Searching for metadata with the query: {0}'.format(json.dumps(meta_q)))

        matches = a.meta.listMetadata(q=json.dumps(meta_q))
        res = []
        fs = ''
        fsi = 0
        f = {}
        for match in matches:
            fs = match['_links']['file']['href']
            fsi = fs.find(filesystem)
            f = a.files.list(systemId = filesystem, filePath = fs[ fsi + len(filesystem) + 1:])
            f = f[0]
            f['lastModified'] = f['lastModified'].strftime('%Y-%m-%d %H:%M:%S')
            f['agavePath'] = 'agave://{0}/{1}'.format(f['system'], f['path'])
            if f['name'] == '.':
                f['name'] = fs.split('/')[-1]
            res.append(f)
        logger.info('Metadata results for query {0}: {1}'.format(meta_q, res))

    except AgaveException as e:
        logger.error('Agave Exception: {0}'.format(e))
        logger.error(traceback.format_exc())
        return HttpResponse('{{"error": "{0}" }}'.format(json.dumps(e.message)),
            status = 500, content_type='application/json')
    except Exception as e:
        logger.error('Exception: {0}'.format(e.message))
        logger.error(traceback.format_exc())
        return HttpResponse('{{"error": "{0}" }}'.format(json.dumps(e.message)),
            status = 500, content_type='application/json')

    return HttpResponse('{{"status": 200, "message": "OK", "result": {0} }}'.format(json.dumps(res)), content_type='application/json', status=200)
