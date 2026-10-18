"""Setup script for Brick Kit."""

from setuptools import setup, find_packages

setup(
    name="brick-kit",
    version="0.1.0",
    description="AI-powered LEGO build agent using Pydantic AI",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires=">=3.11",
    install_requires=[
        "pydantic-ai>=0.0.14",
        "pydantic>=2.0.0",
        "requests>=2.31.0",
        "beautifulsoup4>=4.12.0",
        "playwright>=1.40.0",
        "python-dotenv>=1.0.0",
        "aiofiles>=23.0.0",
        "aiohttp>=3.9.0",
        "lxml>=4.9.0",
    ],
    entry_points={
        "console_scripts": [
            "brick-kit=src.main:main",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
)
