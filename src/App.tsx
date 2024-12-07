import React from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;

// import React from 'react';
// import logo from './logo.svg';
// import './App.css';

// const App = () => (
//   <div className="App">
//     <header className="App-header">
//       <img src={logo} className="App-logo" alt="logo" />
//       <nav>
//         <ul>
//           <li><a href="/home" className="App-link">Home</a></li>
//           <li><a href="/about" className="App-link">About</a></li>
//           <li><a href="/services" className="App-link">Services</a></li>
//           <li><a href="/contact" className="App-link">Contact</a></li>
//           <li><a href="/faq" className="App-link">FAQ</a></li>
//         </ul>
//       </nav>
//     </header>
//     <main>
//       <Switch>
//         <Route path="/home">
//           <h1>Home Page</h1>
//         </Route>
//         <Route path="/about">
//           <h1>About Page</h1>
//         </Route>
//         <Route path="/services">
//           <h1>Services Page</h1>
//         </Route>
//         <Route path="/contact">
//           <h1>Contact Page</h1>
//         </Route>
//         <Route path="/faq">
//           <h1>FAQ Page</h1>
//         </Route>
//         <Route exact path="/">
//           <Redirect to="/home" />
//         </Route>
//       </Switch>
//     </main>
//   </div>
// );


// export default App;

