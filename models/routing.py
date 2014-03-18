import json
from flask import request
from flask.ext.restful import abort, Resource, Api

class ModelApi(Api):
    def register_model(self, model):
        register_api_model(self, model)

def abort_if_request_isnt_json(code=400):
    if request.headers['Content-Type'] != 'application/json':
        abort(code)

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
            abort_if_request_isnt_json()
            model = self.get_or_abort(model_pk)
            model.update(**request.json)
            model.save()
            return self.to_dict(model)

        def delete(self, model_pk):
            model = self.get_or_abort(model_pk)
            model.delete()

    class ModelListResource(BaseModelResource):
        def get(self):
            return self.to_dict(cls.objects)

        def post(self):
            abort_if_request_isnt_json()
            model = cls(**request.json)
            model.save()
            return self.to_dict(model)

    # register api resources
    multiple_url = '/%ss' % model_name
    single_url = multiple_url + '/<%s_pk>' % model_name
    api.add_resource(ModelResource, single_url, endpoint=model_name)
    api.add_resource(ModelListResource, multiple_url, endpoint='%s_list' % model_name)
