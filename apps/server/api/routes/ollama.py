import logging
import subprocess
import asyncio
import json
from typing import List, Dict, Optional, Tuple
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ollama"])


class ModelDownloadRequest(BaseModel):
    model_id: str
    ollama_command: str


class ModelDownloadResponse(BaseModel):
    success: bool
    message: str
    model_id: str


class ModelStatusResponse(BaseModel):
    model_id: str
    installed: bool
    size: Optional[str] = None


class ModelListResponse(BaseModel):
    installed_models: List[str]
    available_models: List[Dict]


def check_ollama_installed() -> bool:
    """Check if Ollama is installed and accessible"""
    try:
        result = subprocess.run(
            ['ollama', '--version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
        return False


async def download_model_async(model_command: str) -> Tuple[bool, str]:
    """
    Download an Ollama model asynchronously
    Returns (success, message)
    """
    try:
        # Extract model name from command (e.g., 'ollama run llama3.2' -> 'llama3.2')
        model_name = model_command.replace('ollama run ', '').strip()
        
        logger.info(f"Starting download for model: {model_name}")
        
        # Run ollama pull command
        process = await asyncio.create_subprocess_exec(
            'ollama',
            'pull',
            model_name,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            logger.info(f"Successfully downloaded model: {model_name}")
            return True, f"Model {model_name} downloaded successfully"
        else:
            error_msg = stderr.decode() if stderr else "Unknown error"
            logger.error(f"Failed to download model {model_name}: {error_msg}")
            return False, f"Failed to download model: {error_msg}"
            
    except Exception as e:
        logger.error(f"Error downloading model: {str(e)}")
        return False, f"Error: {str(e)}"


async def list_installed_models() -> List[str]:
    """List all installed Ollama models"""
    try:
        if not check_ollama_installed():
            return []
        
        process = await asyncio.create_subprocess_exec(
            'ollama',
            'list',
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            # Parse output - format is typically:
            # NAME              ID              SIZE    MODIFIED
            # llama3.2         1234567890      2.0 GB  2024-01-01
            lines = stdout.decode().strip().split('\n')[1:]  # Skip header
            models = []
            for line in lines:
                if line.strip():
                    model_name = line.split()[0] if line.split() else None
                    if model_name:
                        models.append(model_name)
            return models
        else:
            logger.error(f"Failed to list models: {stderr.decode() if stderr else 'Unknown error'}")
            return []
            
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        return []


@router.get("/ollama/check", response_model=Dict[str, bool])
async def check_ollama():
    """Check if Ollama is installed"""
    installed = check_ollama_installed()
    return {"installed": installed}


@router.get("/ollama/models", response_model=ModelListResponse)
async def list_models():
    """List all installed Ollama models"""
    if not check_ollama_installed():
        raise HTTPException(
            status_code=503,
            detail="Ollama is not installed. Please install Ollama first."
        )
    
    installed_models = await list_installed_models()
    
    # Return list of available models (you can expand this with full model list)
    available_models = [
        {"id": "gemma3:1b", "name": "Gemma 3 1B", "size": "815MB"},
        {"id": "gemma3", "name": "Gemma 3 4B", "size": "3.3GB"},
        {"id": "llama3.2", "name": "Llama 3.2 3B", "size": "2.0GB"},
        {"id": "llama3.2:1b", "name": "Llama 3.2 1B", "size": "1.3GB"},
        {"id": "mistral", "name": "Mistral 7B", "size": "4.1GB"},
        {"id": "phi4-mini", "name": "Phi 4 Mini", "size": "2.5GB"},
    ]
    
    return ModelListResponse(
        installed_models=installed_models,
        available_models=available_models
    )


@router.post("/ollama/download", response_model=ModelDownloadResponse)
async def download_model(
    request: ModelDownloadRequest,
    background_tasks: BackgroundTasks
):
    """Download an Ollama model"""
    if not check_ollama_installed():
        raise HTTPException(
            status_code=503,
            detail="Ollama is not installed. Please install Ollama first."
        )
    
    # Start download in background
    success, message = await download_model_async(request.ollama_command)
    
    if success:
        return ModelDownloadResponse(
            success=True,
            message=message,
            model_id=request.model_id
        )
    else:
        raise HTTPException(
            status_code=500,
            detail=message
        )


@router.post("/ollama/download-batch")
async def download_models_batch(
    models: List[ModelDownloadRequest],
    background_tasks: BackgroundTasks
):
    """Download multiple Ollama models"""
    if not check_ollama_installed():
        raise HTTPException(
            status_code=503,
            detail="Ollama is not installed. Please install Ollama first."
        )
    
    results = []
    for model_request in models:
        success, message = await download_model_async(model_request.ollama_command)
        results.append({
            "model_id": model_request.model_id,
            "success": success,
            "message": message
        })
    
    return {
        "results": results,
        "total": len(models),
        "successful": sum(1 for r in results if r["success"]),
        "failed": sum(1 for r in results if not r["success"])
    }


@router.delete("/ollama/model/{model_name}")
async def remove_model(model_name: str):
    """Remove an Ollama model"""
    if not check_ollama_installed():
        raise HTTPException(
            status_code=503,
            detail="Ollama is not installed. Please install Ollama first."
        )
    
    try:
        process = await asyncio.create_subprocess_exec(
            'ollama',
            'rm',
            model_name,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            logger.info(f"Successfully removed model: {model_name}")
            return {"success": True, "message": f"Model {model_name} removed successfully"}
        else:
            error_msg = stderr.decode() if stderr else "Unknown error"
            logger.error(f"Failed to remove model {model_name}: {error_msg}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to remove model: {error_msg}"
            )
            
    except Exception as e:
        logger.error(f"Error removing model: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"
        )


@router.get("/ollama/model/{model_id}/status", response_model=ModelStatusResponse)
async def get_model_status(model_id: str):
    """Check if a specific model is installed"""
    if not check_ollama_installed():
        raise HTTPException(
            status_code=503,
            detail="Ollama is not installed. Please install Ollama first."
        )
    
    installed_models = await list_installed_models()
    
    # Extract base model name from model_id (e.g., 'llama3.2:1b' -> 'llama3.2:1b' or 'llama3.2')
    # Check if model is installed (exact match or base name match)
    model_installed = False
    for installed in installed_models:
        if model_id == installed or model_id.startswith(installed.split(':')[0]):
            model_installed = True
            break
    
    return ModelStatusResponse(
        model_id=model_id,
        installed=model_installed
    )

