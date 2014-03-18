import json
from flask import request
from flask.ext.restful import abort, Resource, Api as _Api
import mongoengine as mongo

class Api(_Api):
    def register_model(self, model):
        register_api_model(self, model)

def get_request_json(code=400):
    if not request.headers['Content-Type'].startswith('application/json'):
        abort(code)
    return request.get_json(force=True)

def register_api_model(api, cls):
    model_name = cls.__name__.lower()

    class BaseModelResource(Resource):
        def to_dict(self, model):
            return json.loads(model.to_json())

    class ModelResource(BaseModelResource):
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
            except mongo.OperationError:
                abort(403)
            else:
                return self.to_dict(model)

        def delete(self, model_pk):
            model = self.get_or_abort(model_pk)
            try:
                model.delete()
            except mongo.OperationError:
                abort(403)

    class ModelListResource(BaseModelResource):
        def get(self):
            return self.to_dict(cls.objects)

        def post(self):
            fields = get_request_json()
            try:
                model = cls(**fields)
                model.save()
            except mongo.OperationError:
                abort(403)
            else:
                return self.to_dict(model)

    # register api resources
    multiple_url = '/%ss' % model_name
    single_url = multiple_url + '/<%s_pk>' % model_name
    api.add_resource(ModelResource, single_url, endpoint=model_name)
    api.add_resource(ModelListResource, multiple_url, endpoint='%s_list' % model_name)
