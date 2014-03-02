import sys
import tweepy
import json

import config
from models import Tweet, Topic

auth_ = tweepy.OAuthHandler(config.consumer_key, config.consumer_secret)
auth_.set_access_token(config.access_token_key, config.access_token_secret)

def _lazy_topic_eval(topic, save=True):
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
    """
    Tweet streamer by topic, taking an optional "tweet_handler", which takes a
    models.Tweet object (not saved to database, but with its topic member set).
    """
    def __init__(self, topic, tweet_handler=None):
        self.topic = _lazy_topic_eval(topic, save=False)
        self.tweet_handler = tweet_handler
        self.listener = TweetListener()
        self.listener.on_tweet = self._tweet_handler

    def _tweet_handler(self, tweet):
        tweet.topic = self.topic
        if self.tweet_handler is not None:
            self.tweet_handler(tweet)
        else:
            print 'Streamed for topic {}: {}'.format(tweet.topic, tweet)

    def run(self):
        """
        Run the streamer with the current handler.
        """
        streamer = tweepy.Stream(auth=auth_, listener=self.listener)
        streamer.filter(track=self.topic.tags)

def collect_for_topic(topic):
    """
    Collect tweets for the given topic, and save them to the database.
    """
    streamer = TopicStreamer(topic, tweet_handler=lambda t: t.save())
    streamer.run()

def _lazy_topic_make(topic_tuple):
    """
    Run the "get-or-create" action for a topic tuple (name, tags), and return the
    associated Topic object.
    """
    return Topic.objects.get_or_create(name=topic_tuple[0],
            defaults={ 'tags': topic_tuple[1] })[0]

if __name__ == '__main__':
    import time
    import multiprocessing as mp
    from mongoengine import connect
    import config
    connect(config.db_name, host=config.db_host, port=config.db_port,
            username=config.db_user, password=config.db_pass)
    topics = map(_lazy_topic_make, (
        ('Happiness', ['happy']),
        ('American sports', ['football', 'baseball', 'hockey']),
        ))
    pool = mp.Pool()
    pool.map_async(collect_for_topic, topics)

    # wait <n> seconds, then quit
    n = 5
    time.sleep(n)
    pool.terminate()
