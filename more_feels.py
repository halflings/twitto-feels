from textblob import TextBlob
from mongoengine import connect, Document, fields
from models import Tweet
import config

connect(config.db_name, host=config.db_host, port=config.db_port,
        username=config.db_user, password=config.db_pass)

class TweetPolarity(Document):
    tweet = fields.ReferenceField(Tweet, required=True)
    polarity = fields.FloatField(required=True)

def naive_tweet_polarity(tweet):
    blob = TextBlob(tweet.status)
    polarities = [x.sentiment.polarity for x in blob.sentences]
    if not polarities:
        return 0
    return sum(polarities) / len(polarities)

if __name__ == '__main__':
    TweetPolarity.objects.delete()

    #limit = 5
    tweets = Tweet.objects#[:limit]
    print 'Computations started!'
    for i, tweet in enumerate(tweets):
        print 'Progress: %s/%s' % (i, len(tweets))
        tweet_polarity = TweetPolarity(tweet=tweet,
                polarity=naive_tweet_polarity(tweet))
        tweet_polarity.save()
