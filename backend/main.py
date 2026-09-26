# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware

# from models import AIRequest
# from services.ai_orchestrator import run_trip_ai


# app = FastAPI(
#     title="Trip Ledger AI",
#     version="1.0.0"
# )


# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


# @app.get("/")
# def home():

#     return {
#         "status": "online",
#         "message": "Trip Ledger AI is running"
#     }


# @app.post("/api/analyze")
# def analyze(request: AIRequest):

#     try:

#         result = run_trip_ai(
#             request.question,
#             request.trip,
#             request.history
#         )

#         return {
#             "success": True,
#             **result
#         }

#     except Exception as error:

#         raise HTTPException(
#             status_code=500,
#             detail=str(error)
#         )



from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import AIRequest
from services.ai_orchestrator import run_trip_ai


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"status": "online"}


@app.post("/api/analyze")
def analyze(request: AIRequest):

    try:

        result = run_trip_ai(
            request.question,
            request.context,
            request.history
        )

        return {
            "success": True,
            **result
        }

    except Exception as error:

        import traceback
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )
