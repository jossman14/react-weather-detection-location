import React from "react";
import ReactDom from "react-dom";
import SeasonDisplay from "./SeasonDisplays";
import Spinner from "./Spinner";

class App extends React.Component {
  state = { lat: null, errMessg: null };

  componentDidMount() {
    window.navigator.geolocation.getCurrentPosition(
      position => {
        this.setState({ lat: position.coords.latitude });
      },
      err => {
        this.setState({ errMessg: err.message });
      }
    );
  }

  renderContent() {
    if (this.state.errMessg && !this.state.lat) {
      return (
        <div>
          <h1> Error: {this.state.errMessg} </h1>
        </div>
      );
    }

    if (this.state.lat && !this.state.errMessg) {
      return (
        <div>
          <h1>
            <SeasonDisplay lat={this.state.lat} />
          </h1>
        </div>
      );
    }

    return (
      <div>
        <Spinner message="Please accept the query location" />
      </div>
    );
  }

  render() {
    return <div className="border red">{this.renderContent()}</div>;
  }
}

ReactDom.render(<App />, document.querySelector("#root"));
