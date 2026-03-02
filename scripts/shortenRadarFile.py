import json 
data = open("all.json").read()
b = json.loads(data)
filtered_features = []
for feature in b["features"]:
    if feature["properties"]["stationType"] == "Profiler":
        continue
    del feature["properties"]
    feature["name"] = feature["id"].split("/")[-1]
    filtered_features.append(feature)

b["features"] = filtered_features
open("radars.json", "w+").write(json.dumps(b, indent=2))