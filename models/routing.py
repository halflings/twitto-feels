import json
from flask.ext.restful import abort, Resource
from mongoengine import OperationError, InvalidQueryError
from helpers import get_request_json, slugify
import inflect

_inflect_engine = inflect.engine()

class ModelResource(Resource):
    def to_dict(self, model):
        return json.loads(model.to_json())

def register_api_model(api, cls):
    model_name = slugify(cls.__name__)

    class SingleModelResource(ModelResource):
        def get_or_abort(self, pk, *args, **kwargs):
            try:
                return cls.objects.get(pk=pk, *args, **kwargs)
            except cls.DoesNotExist:
                abort(404)

        def get(self, model_pk):
            return self.to_dict(self.get_or_abort(model_pk))

        def put(self, model_pk):
            fields = get_request_json()
            model = self.get_or_abort(model_pk)
            try:
                model.update(**fields)
                model.save()
            except OperationError:
                abort(403)
            else:
                return self.to_dict(model)

        def delete(self, model_pk):
            model = self.get_or_abort(model_pk)
            try:
                model.delete()
            except OperationError:
                abort(403)

    class ModelListResource(ModelResource):
        def get(self):
            return self.to_dict(cls.objects)

        def post(self):
            fields = get_request_json()
            try:
                model = cls(**fields)
                model.save()
            except OperationError:
                abort(403)
            else:
                return self.to_dict(model)

    class ModelQueryResource(ModelResource):
        def post(self):
            data = get_request_json()
            if 'query' not in data:
                abort(400)
            query_handler_name = 'handle_%s' % data['query']
            if not hasattr(self, query_handler_name):
                abort(404)
            return getattr(self, query_handler_name)(data)

        def handle_related(self, query):
            if 'on' not in query or 'pk' not in query:
                abort(400)
            try:
                return self.to_dict(cls.objects(**{ query['on']: query['pk'] }))
            except InvalidQueryError:
                abort(403)

    # register api resources
    model_base_url = '/%s' % _inflect_engine.plural(model_name)
    api.add_resource(SingleModelResource, model_base_url + '/<model_pk>', endpoint=model_name)
    api.add_resource(ModelListResource, model_base_url, endpoint='%s_list' % model_name)
    api.add_resource(ModelQueryResource, model_base_url + '/query', endpoint='%s_query' % model_name)
    print ' * [API] registering model %s at %s' % (model_name, model_base_url)
