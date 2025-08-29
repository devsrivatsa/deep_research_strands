#!/usr/bin/env python3
"""Test script to verify local Langfuse connection"""

import os
from dotenv import load_dotenv
from langfuse import Langfuse

def test_langfuse_connection():
    """Test connection to local Langfuse instance"""
    
    # Load environment variables
    load_dotenv()
    
    # Get configuration
    public_key = os.getenv("LANGFUSE_PUBLIC_KEY")
    secret_key = os.getenv("LANGFUSE_SECRET_KEY")
    host = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")
    
    print(f"Testing Langfuse connection...")
    print(f"Host: {host}")
    print(f"Public Key: {'*' * 10 + public_key[-4:] if public_key else 'Not set'}")
    print(f"Secret Key: {'*' * 10 + secret_key[-4:] if secret_key else 'Not set'}")
    print()
    
    if not public_key or not secret_key:
        print("❌ LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY must be set")
        return False
    
    try:
        # Initialize client
        print("Initializing Langfuse client...")
        langfuse = Langfuse(
            public_key=public_key,
            secret_key=secret_key,
            host=host
        )
        
        # Test connection
        print("Testing connection...")
        project = langfuse.get_project()
        
        print("✅ Connection successful!")
        print(f"Project: {project.get('name', 'Unknown')}")
        print(f"Project ID: {project.get('id', 'Unknown')}")
        
        # Test dataset creation
        print("\nTesting dataset creation...")
        try:
            dataset = langfuse.create_dataset(
                name="test_dataset",
                description="Test dataset for connection verification"
            )
            print(f"✅ Dataset created: {dataset.name}")
            
            # Clean up test dataset
            langfuse.delete_dataset(name="test_dataset")
            print("✅ Test dataset cleaned up")
            
        except Exception as e:
            print(f"⚠️ Dataset creation failed (this might be expected): {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    success = test_langfuse_connection()
    if success:
        print("\n🎉 Your local Langfuse instance is working correctly!")
        print("You can now run your application and datasets will be stored locally.")
    else:
        print("\n💥 Connection failed. Please check:")
        print("1. Is your Langfuse container running?")
        print("2. Are the environment variables set correctly?")
        print("3. Can you access the Langfuse UI in your browser?")
        print("4. Are the API keys correct?")
