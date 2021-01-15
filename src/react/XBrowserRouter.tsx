import * as React from "react";
import { Route, Router } from "react-router-dom";
import * as queryString from "query-string";
import { XRouter } from "./XRouter";

interface IProps {
  router: XRouter;
}

export const XBrowserRouter = ({ router }: IProps) => {
  return (
    <Router history={router.history}>
      {router.store.map((route, idx) => {
        const { component, ...cleanedRoute } = route;

        // In case the route contains a custom render we render the route normally
        if (cleanedRoute.render) {
          return <Route key={idx} {...route} />;
        }

        return (
          <Route
            key={idx}
            {...cleanedRoute}
            render={({ match, location }) => {
              return React.createElement(component, {
                ...match.params,
                queryVariables: location.search
                  ? queryString.parse(location.search)
                  : {},
              });
            }}
          />
        );
      })}
    </Router>
  );
};
