import json 
data = open("all.json").read()
b = json.loads(data)
for feature in b["features"]:
    del feature["properties"]
    feature["name"] = feature["id"].split("/")[-1]

open("radars.json", "w+").write(json.dumps(b, indent=2))