#!/usr/bin/env python
# -*- coding: utf-8 -*-

import pandas as pd
import nltk

stopwords = nltk.corpus.stopwords.words('english')
tokenizer = nltk.PunktWordTokenizer()
stemmer = nltk.PorterStemmer()
lemmatizer= nltk.WordNetLemmatizer()

def process_text(text):
    text = text.lower()
    # Tokenizing
    tokens = [token for token in tokenizer.tokenize(text) if token not in stopwords]
    # Stemming
    tokens = map(stemmer.stem, tokens)
    # # Lemmatizing
    # tokens = map(lemmatizer.lemmatize, tokens)

    return tokens

if __name__ == '__main__':

    df = pd.read_csv('dataset.csv', nrows=80000, error_bad_lines=False)

    tagged_tokens = []
    for tweet, sentiment in df[['SentimentText', 'Sentiment']].values:
        tokens = process_text(tweet)
        if tokens:
            tagged_tokens.append([(token, sentiment) for token in tokens])

    training_data = tagged_tokens[:len(tagged_tokens)*3/4]
    test_data = tagged_tokens[len(tagged_tokens)*3/4:]

    tagger = nltk.NgramTagger(2, train=training_data)
    print tagger.evaluate(test_data)
