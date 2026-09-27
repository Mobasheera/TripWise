
# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware

# from models import AIRequest
# from services.ai_orchestrator import run_trip_ai


# app = FastAPI()


# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "http://localhost:3000",
#         "http://127.0.0.1:3000"
#     ],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


# @app.get("/")
# def home():
#     return {"status": "online"}


# @app.post("/api/analyze")
# def analyze(request: AIRequest):

#     try:

#         result = run_trip_ai(
#             request.question,
#             request.context,
#             request.history
#         )

#         return {
#             "success": True,
#             **result
#         }

#     except Exception as error:

#         import traceback
#         traceback.print_exc()

#         raise HTTPException(
#             status_code=500,
#             detail=str(error)
#         )


from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ai_engine import scan_receipt
from models import AIRequest, ReceiptRequest
from services.ai_orchestrator import run_trip_ai


app = FastAPI(title="TripWise AI", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"status": "online", "provider": "groq"}


@app.get("/health")
def health():
    import os
    return {
        "status": "ok",
        "provider": "groq",
        "groq_key_configured": bool(os.getenv("GROQ_API_KEY")),
        "vision_model": os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.8-27b"),
    }


@app.post("/api/analyze")
def analyze(request: AIRequest):
    try:
        result = run_trip_ai(
            request.question,
            request.context,
            request.history,
            request.receipt,
        )

        return {
            "success": True,
            **result,
        }

    except Exception as error:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/api/receipt")
def analyze_receipt(request: ReceiptRequest):
    try:
        if not request.image_data_url.startswith("data:image/"):
            raise HTTPException(
                status_code=400,
                detail="Please upload a valid image receipt.",
            )

        # Groq vision accepts image URLs/data URLs. The frontend resizes the
        # image before sending it so the request remains below the provider limit.
        receipt = scan_receipt(request.image_data_url)

        if not receipt.get("items"):
            raise HTTPException(
                status_code=422,
                detail="The receipt was read, but no line items could be detected.",
            )

        return {
            "success": True,
            "receipt": receipt,
        }

    except HTTPException:
        raise
    except Exception as error:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(error))
