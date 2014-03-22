from textblob import TextBlob
from mongoengine import connect, Document, fields
from models import Tweet
import config

connect(config.db_name, host=config.db_host, port=config.db_port,
        username=config.db_user, password=config.db_pass)

class TweetPolarity(Document):
    tweet = fields.ReferenceField(Tweet, required=True)
    polarity = fields.FloatField(required=True)

def naive_tweet_polarity(tweet, save=False):
    blob = TextBlob(tweet.status)
    polarities = [x.sentiment.polarity for x in blob.sentences]
    tweet_polarity = TweetPolarity()
    tweet_polarity.tweet = tweet
    tweet_polarity.polarity = sum(polarities) / len(polarities) \
            if polarities else 0
    if save:
        tweet_polarity.save()
    return tweet_polarity

if __name__ == '__main__':
    TweetPolarity.objects.delete()
    nbtweets = len(Tweet.objects)
    for i, tweet in enumerate(Tweet.objects):
        print 'Progress: %s/%s' % (i, nbtweets)
        try:
            tweet_polarity = naive_tweet_polarity(tweet)
            tweet_polarity.save()
        except ValueError:
            print 'Failed:', tweet.tweet_id
        else:
            tweet_polarity.save()
