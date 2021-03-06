import sys
import tweepy
import json
from models import Tweet

class TweetListener(tweepy.StreamListener):
    """
    Custom tweepy.StreamListener, used to handle tweets directly through the
    on_tweet method, called with a Tweet object.
    """

    def on_error(self, status_code):
        print >> sys.stderr, 'Error:', status_code
        return False

    def on_data(self, raw_data):
        data = json.loads(raw_data)
        if 'limit' in data and 'track' in data['limit']:
            return
        tweet = Tweet.from_raw_tweet(data)
        if tweet:
            return self.on_tweet(tweet)

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
        if not self.tweet_in_locations(tweet):
            return

        # all is good
        tweet.topic = self.topic
        if self.tweet_handler is not None:
            return self.tweet_handler(tweet)
        else:
            print 'Streamed for topic {}: {}'.format(tweet.topic, tweet)

    def tweet_in_locations(self, tweet):
        """
        Figure out if the tweet is in the locations defined for the current
        topic. Always true when no locations are defined.
        """
        if len(self.topic.locations) == 0:
            return True
        elif len(tweet.location) == 0:
            return False # or True ?

        # coordinates
        lng, lat = tweet.location
        return all(latSW < lat < latNE and lngSW < lng < lngNE \
                for lngSW, latSW, lngNE, latNE in self.topic.location_boxes)

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
