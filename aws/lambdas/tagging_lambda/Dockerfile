FROM public.ecr.aws/lambda/python:3.11

# System libs for OpenCV and BirdNET
RUN yum -y install \
    mesa-libGL \
    libsndfile \
    tar \
    gzip \
    xz \
    && yum clean all


# Static ffmpeg binary (safe for Lambda)
RUN curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz \
    | tar -xJ && \
    cp ffmpeg-*-amd64-static/ffmpeg /usr/bin/ffmpeg && \
    chmod +x /usr/bin/ffmpeg && \
    rm -rf ffmpeg-*-amd64-static


# Set required lib path for soundfile
ENV LD_LIBRARY_PATH=/usr/lib64:/usr/lib:/lib64:/lib

ENV HOME=/tmp \
    MPLCONFIGDIR=/tmp \
    YOLO_CONFIG_DIR=/tmp \
    NUMBA_CACHE_DIR=/tmp/numba_cache \
    NUMBA_DISABLE_CACHE=1 \
    NUMBA_DISABLE_JIT=1 \
    PYTHONPATH=/var/task

WORKDIR /var/task

# ── Install Python dependencies
COPY requirements.txt .
ENV PYTHONPATH="/var/task"

RUN pip install --no-cache-dir -r requirements.txt

# ── Copy source code
COPY . .



# ── Set Lambda handler
CMD ["tagger_lambda.lambda_handler"]
