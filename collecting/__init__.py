import sys
import tweepy
import json
from models import Tweet

class TweetListener(tweepy.StreamListener):
    """
    Custom tweepy.StreamListener, used to handle tweets directly through the
    on_tweet method, called with a Tweet object.
    """

    # TODO : this is
    def valid_location(self, status):
        return True
        # TODO : this currently always return 2, the example should be integrated with the topic's location
        if status.coordinates is None:
            return False

        lat = status.coordinates['coordinates'][1]
        lng = status.coordinates['coordinates'][0]
        return 25.1 < lat < 49.1 and -125 < lng < -60.5

    def on_error(self, status_code):
        print >> sys.stderr, 'Error:', status_code
        return False

    def on_data(self, raw_data):
        data = json.loads(raw_data)
        if ('limit' in data and 'track' in data['limit']) or not self.valid_location(raw_data):
            return

        return self.on_tweet(Tweet.from_raw_tweet(data))

    def on_tweet(self, tweet):
        """
        Handler called when a new tweet is streamed, taking the associated
        Tweet object. Return False to stop listening.
        """
        print tweet

class TopicStreamer(object):
    """
    Tweet streamer by topic, taking an optional "tweet_handler", which takes a
    models.Tweet object (not saved to database, but with its topic member set).
    Auth parameter should be a valid tweepy auth handler.
    """
    def __init__(self, auth, topic, tweet_handler=None):
        self.auth = auth
        self.topic = topic
        self.tweet_handler = tweet_handler
        self.listener = TweetListener()
        self.listener.on_tweet = self._tweet_handler

    def _tweet_handler(self, tweet):
        tweet.topic = self.topic
        if self.tweet_handler is not None:
            return self.tweet_handler(tweet)
        else:
            print 'Streamed for topic {}: {}'.format(tweet.topic, tweet)

    def run(self):
        """
        Run the streamer with the current handler.
        """
        streamer = tweepy.Stream(auth=self.auth, listener=self.listener)
        streamer.filter(track=self.topic.tags, locations=self.topic.locations)

def collect_for_topic(auth, topic, tweet_handler):
    """
    Collect tweets for the given topic, and save them to the database.
    """
    streamer = TopicStreamer(auth, topic, tweet_handler)
    streamer.run()
