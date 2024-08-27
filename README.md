# test-js-website
 
# How to run the site:

First make sure you are running the local database API. 
This can be found on the exosky repository. 

First, edit ```src/main.py``` to have the exoplanet ID set to "Earth".

Next, run ```python -m src.main.py```

When that finishes, turn on the database API by running ```python -m src.database_api.app```. 

The API should now be online locally for you to query.

Next, run ```python -m http.server```.

Navigate to ```http://0.0.0.0:8000/```. The site should be up and running