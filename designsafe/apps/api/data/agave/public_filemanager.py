from agavepy.agave import AgaveException, Agave
from agavepy.async import AgaveAsyncResponse, TimeoutError, Error
from designsafe.apps.api.exceptions import ApiException
from designsafe.apps.api.data.agave.agave_object import AgaveObject
from designsafe.apps.api.data.agave.file import AgaveFile
from django.conf import settings
import urllib
import os
import logging
logger = logging.getLogger(__name__)

class FileManager(AgaveObject):
    resource = 'agave'
    system_id = 'nees.public'

    def __init__(self, user_obj, **kwargs):
        super(FileManager, self).__init__(**kwargs)
        username = user_obj.username
        if user_obj.agave_oauth.expired:
            user_obj.agave_oauth.referer()

        token = user_obj.agave_oauth
        access_token = token.access_token
        agave_url = getattr(settings, 'AGAVE_TENANT_BASEURL')
        self.resource = kwargs.get('resource')
        self.system_id = 'nees.public'
        self.agave_client = Agave(api_server = agave_url, token = access_token)
        self.username = username

    def parse_file_id(self, file_id):
        """Parses a `file_id`.

        :param str file_id: String with the format
        <filesystem id>[ [ [/ | /<file_path>] ] ]

        :returns: a list with up to two elements

            * index 0 `system_id`: String. Filesystem id
            * index 1 `file_path`: String. Complete file path.
        :rtype: list

        :raises ValueError: if the object is not in the desired format

        Examples:
        --------
            `file_id` can look like this:
              `nees.public`:
              Points to the root folder in the
              `nees.public` filesystem.

              `nees.public/NEES-1234-5678.groups`:
              Points to the NEES-1234-5678 project directory.

              `nees.public/NEES-1234-5678.groups/folder`:
              Points to the folder `folder` in the NEES-1234-5678 project directory.

              `nees.public/NEES-1234-5678.groups/folder/file.txt`:
              Points to the file `file.txt` in the folder `folder` in the NEES-1234-5678
              project directory.
        """
        if file_id is None or file_id == '':
            system_id = self.system_id
            file_path = ''
        else:
            components = file_id.strip('/').split('/')
            system_id = components[0] if len(components) >= 1 else self.system_id
            file_path = '/'.join(components[1:]) if len(components) >= 2 else ''

        return system_id, file_path

    def listing(self, file_id=None, **kwargs):
        """
        Lists contents of a folder or details of a file.

        :param str file_id: id representing the file. Format:
        <filesystem id>[ [ [/ | /<username> [/ | /<file_path>] ] ] ]

        :returns:listing dict. A dict with the properties of the
        parent path file object plus a `childrens` key with a list
        of :class:`~.
        If the `file_id` passed is a file and not a folder the
        `children` list will be empty.
        :rtype: dict

        Examples:
            A listing dictionary:
            ```{
                  _pems: [ ],
                  type: "folder",
                  path: "",
                  id: "nees.public/path/folder",
                  size: 32768,
                  name: "experiments",
                  lastModified: "2016-04-26T22:25:30-0500",
                  system: "nees.public",
                  children: [],
                  source: "agave",
                  ext: "",
                  _actions: [ ],
                  _trail: [ ]
                }
            ```

            To loop through the listing's files:
            >>> listing = fm.listing(**kwargs)
            >>> for child in listing['children']:
            >>>     do_something_cool(child)
        """
        system, file_path = self.parse_file_id(file_id)
        listing = AgaveFile.listing(system, file_path, self.agave_client, source='public')

        root_file = filter(lambda x: x.full_path == file_path, listing)

        list_data = root_file[0].to_dict()
        list_data['children'] = [o.to_dict() for o in listing if o.full_path != file_path]

        return list_data



    def search(self, **kwargs):
        return [{}]
