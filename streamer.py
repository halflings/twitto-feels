import sys
import tweepy
import json

import config
from models import Tweet, Topic

auth_ = tweepy.OAuthHandler(config.consumer_key, config.consumer_secret)
auth_.set_access_token(config.access_token_key, config.access_token_secret)

def lazy_topic_eval(topic, save=True):
    """
    Small helper taking many forms of parameters, but always returning a Topic
    object, which is guaranteed to be saved in the database.
    Accepted parameters types are:
    - Topic: make sure model is saved in the database
    - int: get the associated Topic object from the database, and possibly
      raising Topic.DoesNotExist
    - other: considered as a dict-like object, and is dereferenced in order to
      build a new Topic object
    Of course, if you don't want the topic to be saved to the database, you can
    always pass the "save" parameter, setting it to False.
    """
    if isinstance(topic, Topic):
        if topic.pk is None and save:
            topic.save()
        return topic
    elif isinstance(topic, int):
        topic = Topic.objects.get(pk=topic)
    else:
        topic = Topic(**topic)
    if save:
        topic.save()
    return topic

class TweetListener(tweepy.StreamListener):
    def on_error(self, status_code):
        print >> sys.stderr, 'Error:', status_code
        return False

    def on_data(self, raw_data):
        data = json.loads(raw_data)
        if 'limit' in data and 'track' in data['limit']:
            return
        self.on_tweet(Tweet.from_raw_tweet(data))

    def on_tweet(self, tweet):
        """
        Handler called when a new tweet is streamed, taking the associated
        Tweet object.
        """
        print tweet

class TopicStreamer(object):
    def __init__(self, topic):
        self.topic = lazy_topic_eval(topic, save=False)

    def _tweet_handler(self, tweet):
        tweet.topic = self.topic
        #tweet.save()

    @property
    def listener(self):
        if not hasattr(self, '_listener') or self._listener is None:
            self._listener = TweetListener()
            self._listener.on_tweet = self._tweet_handler
        return self._listener

    def run(self):
        streamer = tweepy.Stream(auth=auth_, listener=self.listener)
        streamer.filter(track=self.topic.tags)

if __name__ == '__main__':
    from mongoengine import connect
    import config
    connect(config.db_name, host=config.db_host, port=config.db_port,
            username=config.db_user, password=config.db_pass)
    topic = Topic.objects.get_or_create(name='Happiness',
            defaults={ 'tags': ['happy'] })[0]
    streamer = TopicStreamer(topic)
    streamer.run()
