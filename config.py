import os
from dotenv import load_dotenv, find_dotenv
from pydantic import BaseModel, Field



def get_google_api_key():
    load_dotenv()
    return os.getenv("GOOGLE_API_KEY")

class Config(BaseModel):
    google_api_key: str = Field(description="The API key for the Google API")
    gcs_project_name: str = Field(description="The project name for the GCS")
    exa_api_key: str = Field(description="The API key for the Exa API")
    ncbi_api_key: str = Field(description="The API key for the NCBI API for pubmed")
    langfuse_public_key: str = Field(description="The public key for the Langfuse API")
    langfuse_secret_key: str = Field(description="The secret key for the Langfuse API")
    langfuse_host: str = Field(description="The host for the Langfuse API")

    @classmethod
    def load(cls):
        load_dotenv(find_dotenv())
        return cls(
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            gcs_project_name=os.getenv("GCS_PROJECT_NAME"),
            exa_api_key=os.getenv("EXA_API_KEY"),
            ncbi_api_key=os.getenv("NCBI_API_KEY"),
            langfuse_public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
            langfuse_secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
            langfuse_host=os.getenv("LANGFUSE_HOST")
        )

    @classmethod
    def as_dict(cls):
        return cls.load().model_dump()
