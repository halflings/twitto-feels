from textblob import TextBlob
from mongoengine import Document, fields
from models import TweetPolarity

def naive_tweet_polarity(tweet):
    """
    *Very* naive algorithm computing tweet polarity (ranging from -1 to 1).
    Returns an associated TweetPolarity object.
    """
    blob = TextBlob(tweet.status)
    polarities = [x.sentiment.polarity for x in blob.sentences]
    tweet_polarity = TweetPolarity()
    tweet_polarity.tweet = tweet
    tweet_polarity.polarity = sum(polarities) / len(polarities) \
            if polarities else 0
    return tweet_polarity

if __name__ == '__main__':
    from mongoengine import connect
    from models import Tweet
    import config

    connect(config.db_name, host=config.db_host, port=config.db_port,
            username=config.db_user, password=config.db_pass)

    TweetPolarity.objects.delete()
    nbtweets = len(Tweet.objects)
    for i, tweet in enumerate(Tweet.objects):
        print 'Progress: %s/%s' % (i+1, nbtweets)
        try:
            tweet_polarity = naive_tweet_polarity(tweet)
            tweet_polarity.save()
        except ValueError:
            print 'Failed:', tweet.tweet_id
        else:
            tweet_polarity.save()
