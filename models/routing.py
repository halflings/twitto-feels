import json
from flask.ext.restful import abort, Resource
from mongoengine import OperationError
from helpers import get_request_json

class ModelResource(Resource):
    def to_dict(self, model):
        return json.loads(model.to_json())

def register_api_model(api, cls):
    model_name = cls.__name__.lower()

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

    # register api resources
    model_base_url = '/%ss' % model_name
    api.add_resource(SingleModelResource, model_base_url + '/<model_pk>',
            endpoint=model_name)
    api.add_resource(ModelListResource, model_base_url,
            endpoint='%s_list' % model_name)
