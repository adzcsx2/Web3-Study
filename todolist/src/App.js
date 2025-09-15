import logo from "./logo.svg";
import "./App.css";
import TodoDataList from "./conponent/TodoDataList";
import { AddDialog } from "./conponent/AddDialog";
import { useState } from "react";
import { Provider as BusProvider, useBus, useListener } from "react-bus";
function App() {
   function AppContext() {
      const [isShowAdd, setIsShowAdd] = useState(false);
      const bus = useBus();
      useListener("isShowAddDialog", () => {
         setIsShowAdd(false);
      });
      return (
         <div>
            <img
               onClick={() => {
                  console.log("click");
                  bus.emit("isShowAddDialog", true);
               }}
               src={logo}
               className="App-logo"
            />
            <button
               style={{ width: "100px", height: "50px" }}
               onClick={() => {
                  console.log("click");
                  bus.emit("isShowAddDialog", true);
               }}
            >
               添加
            </button>
            <TodoDataList></TodoDataList>
            <AddDialog></AddDialog>
         </div>
      );
   }

   return (
      <BusProvider>
         <div className="App">
            <header className="App-header">
               <AppContext></AppContext>
            </header>
         </div>
      </BusProvider>
   );
}

export default App;
