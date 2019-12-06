import React from "react";
import "./SeasonDisplays.css";

const seasonDetail = {
  winter: {
    iconName: "snowflake",
    text: "adem gan!"
  },
  summer: {
    iconName: "sun",
    text: "panaaass oiiii!"
  }
};

const getSeason = (lat, month) => {
  if (month > 2 && month < 9) {
    return lat > 0 ? "winter" : "summer";
  } else {
    return lat > 0 ? "summer" : "winter";
  }
};

const SeasonDisplays = props => {
  const season = getSeason(props.lat, new Date().getMonth());
  const { iconName, text } = seasonDetail[season];

  return (
    <div className={`season-display ${season}`}>
      <i className={` icon-left massive ${iconName} icon`} />
      <h1>{text}</h1>
      <i className={` icon-right massive  ${iconName} icon`} />
    </div>
  );
};

export default SeasonDisplays;
