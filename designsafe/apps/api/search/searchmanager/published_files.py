"""
.. module: portal.apps.api.search.searchmanager.published_files
   :synopsis: Manager handling published file searches.
"""

from __future__ import unicode_literals, absolute_import
import logging
from designsafe.apps.api.search.searchmanager.base import BaseSearchManager
from designsafe.apps.data.models.elasticsearch import IndexedFile
from elasticsearch_dsl import Q, Search, Index
from django.conf import settings

logger = logging.getLogger(__name__)


class PublishedDataSearchManager(BaseSearchManager):
    """ Search manager handling Published data.
    """

    def __init__(self, request=None, **kwargs):
        if request:
            self.query_string = request.GET.get('query_string').replace("/", "\\/")
        else:
            self.query_string = kwargs.get('query_string').replace("/", "\\/")

        super(PublishedDataSearchManager, self).__init__(
            IndexedFile, IndexedFile.search())

    def construct_query(self, system=None, file_path=None):

        files_index_name = Index(settings.ES_INDEX_PREFIX.format('files')).get_alias().keys()[0]
        ngram_query = Q("query_string", query=self.query_string,
                        fields=["name"],
                        minimum_should_match='80%',
                        default_operator='or')

        match_query = Q("query_string", query=self.query_string,
                        fields=[
                            "name._exact", "name._pattern"],
                        default_operator='and')

        published_files_query = Q(
            'bool',
            must=[
                Q({'term': {'_index': files_index_name}}),
                Q('term', system="designsafe.storage.published"),
                (ngram_query | match_query)
            ],
            must_not=[
                Q({"prefix": {"path._exact": "/Trash"}})
            ]
        )

        return published_files_query

    def listing(self, system, file_path, offset=0, limit=100, **kwargs):
        """Perform the search and output in a serializable format."""
        
        query = self.construct_query(system, file_path)
        listing_search = Search()
        listing_search = listing_search.query(query)
        listing_search = listing_search.extra(from_=offset, size=limit)
        res = listing_search.execute()
        
        children = []
        if res.hits.total.value:
            children = [o.to_dict() for o in res]

        result = {
            'trail': [{'name': '$SEARCH', 'path': '/$SEARCH'}],
            'name': '$SEARCH',
            'path': '/',
            'system': system,
            'type': 'dir',
            'children': children,
            'permissions': 'READ'
        }
        return result
