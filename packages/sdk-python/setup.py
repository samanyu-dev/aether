from setuptools import setup, find_packages

setup(
    name="aether-observe",
    version="0.2.0a1",
    author="Aether Authors",
    author_email="maintainers@aether.dev",
    description="Lightweight realtime cognition replay SDK for AI agents.",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/your-username/Aether",
    packages=find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.9",
    install_requires=[
        "requests>=2.25.0",
        "websocket-client>=1.0.0",
    ],
    entry_points={
        "console_scripts": [
            "aether=aether.cli:main",
        ],
    },
)
