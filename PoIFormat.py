import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class PoI(BaseModel):
    name: str = Field(description="This is the name of the point of interest that is being analyzed")
    boundingBox: list[list[float]] = Field(description="This is the bounding box of the point of interest that is being analyzed. It is a list of coordinates following the format of longitude FIRST then latitude SECOND. THe bounding box is a polygon and therefore should have a MINIMUM of THREE points to be fully DEFINED. However, you can have many more points to create a bounding polygon of higher fidelity.")
    type: ActivityCategory = Field(description="Activity type of the PoI")
    imint: IMINTRequest = Field(description="Is an IMINT request needed")
    ais: AISRequest = Field(description="Is an AIS request needed")
    adsb: ADSBequest = Field(description="Is an ADS-B request needed")

class IMINTCadence(str, Enum):
    MAXIMUM_COVERAGE = "MAXIMUM",
    MEDIUM_COVERAGE = "MEDIUM",
    MINIMUM_COVERAGE = "MINIMUM",

class Cadence(str, Enum):
    HOURLY = "HOURLY",
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",

class IMINTRequest(BaseModel):
    needed:bool = Field(description="Is image intelligence from satellites required for this analysis")
    cadence: IMINTCadence = Field(description="This is the image intelligence cadence required for this analysis")
    justification: str = Field(description="This is justification of why image intelligence is or is not required for this analysis")


class AISRequest(BaseModel):
    needed:bool = Field(description="Is AIS required for this analysis")
    cadence: Cadence = Field(description="This is the AIS cadence required for this analysis")
    justification: str = Field(description="This is justification of why AIS is or is not required for this analysis")

class ADSBequest(BaseModel):
    needed:bool = Field(description="Is ADS-B required for this analysis")
    cadence: Cadence = Field(description="This is the ADS-B cadence required for this analysis")
    justification: str = Field(description="This is justification of why ADS-B is or is not required for this analysis")

class PoIs(BaseModel):
    pois : list[PoI] = Field(description="List of all PoIs that are being analyzed.")
class Asset(BaseModel):
    name: str = Field(description="This is the name of the asset that is being analyzed")
    description: str = Field(description="This is the description of the asset that is being analyzed")
    type: str = Field(description="This is the type of the asset that is being analyzed.(for ships list class-name + role; e.g. Nimitz Class Aircraft Carrier)")
    quantity: Optional[str] = Field(description="This field is ONLY to be used when counting high numerical value units. For instance, aircraft, tanks, and artillery pieces fall into this category")
    confidence: float = Field(description="Confidence level of your analysis PoI")
    notes: Optional[str] = Field(description="Any peculiarities that need to be noted")

class ActivityCategory(str, Enum):
    MILITARY_MOVEMENT = "MILITARY_MOVEMENT"
    LOGISTICS = "LOGISTICS"
    CONSTRUCTION = "CONSTRUCTION"
    DIPLOMATIC = "DIPLOMATIC"
    ECONOMIC = "ECONOMIC"
    ANOMALOUS = "ANOMALOUS"
    ROUTINE = "ROUTINE"

class PoIType(str, Enum):
    PORT: str = "PORT"
    AIRFIELD: str = "AIRFIELD"
    TANK_FARM: str = "TANK_FARM"
    FOB: str = "FOB"


class Importance(str, Enum):
    WARNING = "WARNING"
    BREAKING = "BREAKING"
    CRISIS = "CRISIS"

class PoIAnalysis(BaseModel):
    analysisDate : str = Field(description="Date at which the PoI is being analyzed")
    imageDate : str = Field(description="Date of most recent imagery used")

    poi_name: str = Field(description="Name of the PoI")
    poi_coordinates: tuple[float, float] = Field(description="Coordinates of the PoI(Lat, Long)")

    activity_category: ActivityCategory = Field(description="Activity category of the PoI")
    notableAssets: Optional[list[Asset]] = Field(description="This is the list of all notable assets that the PoI contains or is related to, depending on the context of the situation. For instance, 3 US aircraft carriers docket a one port would be worth mentioning. If not applicable, leave this field empty.")

    importance: Importance = Field(description="Importance of the PoI")
    synopsis: str = Field(description="This is the synopsis of events at the PoI")
    overallConfidence: float = Field(description="Overall confidence level of your analysis PoI")

