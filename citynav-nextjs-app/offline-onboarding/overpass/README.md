# Overpass Queries

We use parameterized Overpass QL POST requests scoped by center (lat/lon) and radius (meters). Queries retrieve:
- amenity=hospital|clinic|bank|atm|restaurant|hotel
- public_transport=platform|stop_position
- highway=bus_stop
- railway=station

See template in query-template.overpassql
