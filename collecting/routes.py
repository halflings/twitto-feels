from multiprocessing import Process, Event, Queue
from flask import abort
from flask.ext.restful import Resource
from mongoengine import ValidationError, connect
from mongoengine.errors import OperationError
import tweepy
from collecting import collect_for_topic
from models import Topic
from models.routing import ModelResource
from more_feels import naive_tweet_polarity
from helpers import get_request_json
import config

collectors = {}

class CollectorProcess(Process):
    def __init__(self, topic):
        super(CollectorProcess, self).__init__()
        self.topic = topic
        self.should_stop = Event()
        self.queue = Queue()

    def run(self):
        auth = tweepy.OAuthHandler(config.consumer_key,
                config.consumer_secret)
        auth.set_access_token(config.access_token_key,
                config.access_token_secret)
        connect(config.db_name, host=config.db_host, port=config.db_port,
                username=config.db_user, password=config.db_pass)
        collect_for_topic(auth, self.topic, self.handle_tweet)

    def handle_tweet(self, tweet):
        try:
            tweet.save()
            tweet = naive_tweet_polarity(tweet)
            self.queue.put(tweet)
            #print 'Saved: https://twitter.com/%s/status/%s' % (tweet.user, tweet.tweet_id)
        except (ValidationError, OperationError) as e:
            pass#print 'Not saved:', e
        return not self.should_stop.is_set()

class CollectorListResource(Resource):
    def get(self):
        return collectors.keys()

    def post(self):
        data = get_request_json()
        if 'topic_id' not in data:
            abort(400)
        if data['topic_id'] in collectors:
            abort(403)
        topic_pk = data['topic_id']
        try:
            topic = Topic.objects.get(pk=topic_pk)
        except (ValidationError, Topic.DoesNotExist):
            abort(404)
        collector_proc = CollectorProcess(topic)
        collectors[topic_pk] = collector_proc
        collector_proc.start()
        return data

class CollectorResource(Resource):
    def delete(self, topic_pk):
        if topic_pk not in collectors:
            abort(403)
        collector_proc = collectors[topic_pk]
        collector_proc.should_stop.set()
        del collectors[topic_pk]
        collector_proc.join(3) # magic number again !
        collector_proc.terminate()

class CollectorPollingResource(ModelResource):
    def get(self, topic_pk):
        if topic_pk not in collectors:
            abort(403)
        collector_proc = collectors[topic_pk]
        tweet = collector_proc.queue.get()
        return self.to_dict(tweet)
