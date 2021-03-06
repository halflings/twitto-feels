from flask import Flask
from flask.ext.restful import Api
from werkzeug.serving import WSGIRequestHandler
from mongoengine import connect
from models import Tweet, Topic
from models.routing import register_api_model
from collecting.routes import (CollectorListResource,
        CollectorResource, CollectorPollingResource)
import config

app = Flask(__name__, static_url_path='')
api = Api(app, prefix='/api')

connect(config.db_name, host=config.db_host, port=config.db_port,
        username=config.db_user, password=config.db_pass)

@app.route('/')
def index():
    return app.send_static_file('index.html')

# register api models
register_api_model(api, Topic)
register_api_model(api, Tweet)

# collectors resource
api.add_resource(CollectorListResource, '/collectors')
api.add_resource(CollectorResource, '/collectors/<topic_pk>')
api.add_resource(CollectorPollingResource, '/collector_polling/<topic_pk>')

class SafeRequestHandler(WSGIRequestHandler):
    def connection_dropped(self, error, environ=None):
        print 'connection dropped'

if __name__ == '__main__':
    import sys
    app.run(debug='--debug' in sys.argv, request_handler=SafeRequestHandler)
