from setuptools import setup, find_packages


setup(
    name="cv-suite",
    version="0.1.0",
    packages=find_packages(include=["modules", "modules.*"]),
    include_package_data=True,
)
