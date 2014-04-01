from textblob import TextBlob
from mongoengine import Document, fields
from models import Tweet

def naive_tweet_polarity(tweet):
    """
    *Very* naive algorithm computing tweet polarity (ranging from -1 to 1).
    """
    blob = TextBlob(tweet.status)
    polarities = [x.sentiment.polarity for x in blob.sentences]
    tweet.polarity = sum(polarities) / len(polarities) \
            if polarities else 0
    return tweet

if __name__ == '__main__':
    from mongoengine import connect
    from models import Tweet
    import config

    connect(config.db_name, host=config.db_host, port=config.db_port,
            username=config.db_user, password=config.db_pass)

    nbtweets = len(Tweet.objects)
    for i, tweet in enumerate(Tweet.objects):
        print 'Progress: %s/%s' % (i+1, nbtweets)
        try:
            tweet = naive_tweet_polarity(tweet)
        except ValueError:
            print 'Failed:', tweet.tweet_id
        else:
            tweet.save()
