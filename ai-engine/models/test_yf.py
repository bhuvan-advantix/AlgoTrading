"""Test Yahoo Finance"""
import yfinance as yf
import pandas as pd

print("Testing Yahoo Finance...")

ticker = yf.Ticker("TCS.NS")
df = ticker.history(period="1mo", interval="1d")

print(f"\nData shape: {df.shape}")
print(f"\nColumns: {df.columns.tolist()}")
print(f"\nFirst few rows:")
print(df.head())
print(f"\nData types:")
print(df.dtypes)
