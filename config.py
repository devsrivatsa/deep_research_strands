import os
import base64
from dotenv import load_dotenv, find_dotenv
from pydantic import BaseModel, Field
from typing import Optional


def get_google_api_key():
    load_dotenv()
    return os.getenv("GOOGLE_API_KEY")

class Config(BaseModel):
    # API Keys
    google_api_key: Optional[str] = Field(default=None, description="The API key for the Google API")
    gcs_project_name: Optional[str] = Field(default=None, description="The project name for the GCS")
    exa_api_key: Optional[str] = Field(default=None, description="The API key for the Exa API")
    ncbi_api_key: Optional[str] = Field(default=None, description="The API key for the NCBI API for pubmed")
    
    # Langfuse Configuration
    langfuse_public_key: Optional[str] = Field(default=None, description="The public key for the Langfuse API")
    langfuse_secret_key: Optional[str] = Field(default=None, description="The secret key for the Langfuse API")
    langfuse_host: Optional[str] = Field(default=None, description="The host for the Langfuse API")
    
    # OpenTelemetry Configuration (computed)
    otel_exporter_otlp_endpoint: Optional[str] = Field(default=None, description="The endpoint for the OpenTelemetry exporter")
    otel_exporter_otlp_headers: Optional[str] = Field(default=None, description="The headers for the OpenTelemetry exporter")
    langfuse_auth: Optional[str] = Field(default=None, description="The auth for the Langfuse API")
    
    # Observability Settings
    enable_tracing: bool = Field(default=True, description="Enable OpenTelemetry tracing")
    enable_console_export: bool = Field(default=False, description="Enable console trace export for development")
    trace_sample_rate: float = Field(default=1.0, description="Sampling rate for traces (0.0 to 1.0)")

    @classmethod
    def load(cls):
        load_dotenv(find_dotenv())
        
        # Get base configuration
        langfuse_public_key = os.getenv("LANGFUSE_PUBLIC_KEY")
        langfuse_secret_key = os.getenv("LANGFUSE_SECRET_KEY") 
        langfuse_host = os.getenv("LANGFUSE_HOST")
        
        # Configure OpenTelemetry for Langfuse integration
        langfuse_auth = None
        otel_endpoint = None
        otel_headers = None
        
        if langfuse_public_key and langfuse_secret_key and langfuse_host:
            # Create Langfuse auth token
            langfuse_auth = base64.b64encode(
                f"{langfuse_public_key}:{langfuse_secret_key}".encode()
            ).decode()
            
            # Set up OTLP endpoint and headers for Langfuse
            otel_endpoint = f"{langfuse_host}/api/public/ingestion"
            otel_headers = f"Authorization=Basic {langfuse_auth}"
            
            # Set environment variables for OpenTelemetry
            os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = otel_endpoint
            os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = otel_headers
        
        return cls(
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            gcs_project_name=os.getenv("GCS_PROJECT_NAME"),
            exa_api_key=os.getenv("EXA_API_KEY"),
            ncbi_api_key=os.getenv("NCBI_API_KEY"),
            langfuse_public_key=langfuse_public_key,
            langfuse_secret_key=langfuse_secret_key,
            langfuse_host=langfuse_host,
            otel_exporter_otlp_endpoint=otel_endpoint,
            otel_exporter_otlp_headers=otel_headers,
            langfuse_auth=langfuse_auth,
            enable_tracing=os.getenv("ENABLE_TRACING", "true").lower() == "true",
            enable_console_export=os.getenv("ENABLE_CONSOLE_EXPORT", "false").lower() == "true",
            trace_sample_rate=float(os.getenv("TRACE_SAMPLE_RATE", "1.0"))
        )

    @classmethod
    def as_dict(cls):
        return cls.load().model_dump()
