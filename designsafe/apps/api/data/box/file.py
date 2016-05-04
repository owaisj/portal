from designsafe.apps.api.data.abstract.files import AbstractFile
from boxsdk.object.file import File
import logging
import os

logger = logging.getLogger(__name__)


class BoxFile(AbstractFile):

    source = 'box'

    def __init__(self, box_item, parent=None):
        super(BoxFile, self).__init__()
        self._item = box_item
        if parent:
            self._parent = BoxFile(parent)
        else:
            self._parent = None

    @property
    def id(self):
        return '{}/{}'.format(self._item.type, self._item.id)

    @property
    def name(self):
        return self._item.name

    @property
    def path(self):
        try:
            path = '/'.join([e['name'] for e in self._item.path_collection['entries'][1:]])
        except AttributeError:
            if self._parent:
                if self._parent.id == 'folder/0':  # Suppress 'All Files' name in path
                    path = ''
                else:
                    path = '/'.join([self._parent.path, self._parent.name])
            else:
                path = None
        return path

    @property
    def size(self):
        try:
            return self._item.size
        except AttributeError:
            return None

    @property
    def last_modified(self):
        try:
            return self._item.modified_at
        except AttributeError:
            return None

    @property
    def type(self):
        return self._item.type

    @property
    def ext(self):
        return os.path.splitext(self.name)[1]

    @property
    def trail(self):
        try:
            return [BoxFile(File(None, e['id'], e)).to_dict()
                    for e in self._item.path_collection['entries']]
        except AttributeError as e:
            return []

    @staticmethod
    def parse_file_path(file_path):
        """
        Parses out the file_path that the Data Browser uses. For Box objects, this is in
        the format {type}/{id}, where {type} is in ['folder', 'file'] and {id} is the
        numeric id of the Box object.

        Args:
            file_path: The file_path in the format {type}/{id}

        Returns:
            Tuple of ({type}, {id})

        Raises:
            AssertionError
        """
        parts = file_path.split('/')

        assert len(parts) == 2, 'The file path should be in the format {type}/{id}'
        assert parts[0] in ['folder', 'file'], '{type} must be one of ["folder", "file"]'
        assert parts[1].isdigit(), '{id} should be digits only'

        return parts[0], parts[1]

    def to_dict(self, **kwargs):
        return {
            'source': self.source,
            'id': self.id,
            'type': self.type,
            'path': self.path,
            'name': self.name,
            'ext': self.ext,
            'size': self.size,
            'lastModified': self.last_modified,
            '_trail': self.trail,
            '_actions': [],
            '_pems': [],
        }
