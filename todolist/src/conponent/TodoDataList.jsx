import React, { useState, useCallback, useEffect, useRef } from "react";

import axios from "axios";

import styles from "./css/TodoDataList.module.css";
import classNames from "classnames/bind";
import FormDialog from "./FormDialog";
import DeleteDialog from "./DeleteDialog";
import Checkbox from "@mui/material/Checkbox";

import { green, pink } from "@mui/material/colors";
import { Provider as BusProvider, useBus, useListener } from "react-bus";

const cls = classNames.bind(styles);
// 创建独立的 TodoItem 组件
const TodoItem = React.memo(
   ({ todoListData, onUpdate, onDelete, onToggle, onAdd }) => {
      const [isShowUpdateDialog, setIsShowUpdateDialog] = useState(false);
      const [isShowDeleteDialog, setIsShowDeleteDialog] = useState(false);
      const [selectData, setSelectData] = useState({
         id: "",
         type: "",
         content: "",
      });

      const _setSelectData = (type, data) => {
         let content = "";
         if (type === "userId") content = data.userId;
         if (type === "content") content = data.title;

         setSelectData({
            type: type,
            content: content,
            id: data.id,
         });
      };

      return (
         <div className={cls("todo-list-div")} key={todoListData.id}>
            <p className={cls("todo-list-p")}>
               Id : [{todoListData.id}] , userId : {todoListData.userId} ,
               content :{todoListData.title}
            </p>
            <button
               onClick={() => {
                  setIsShowUpdateDialog(true);
                  _setSelectData("userId", todoListData);
               }}
            >
               修改userId
            </button>
            <button
               onClick={() => {
                  setIsShowUpdateDialog(true);
                  _setSelectData("content", todoListData);
               }}
            >
               修改内容
            </button>
            <button
               onClick={() => {
                  _setSelectData("delete", todoListData);
                  setIsShowDeleteDialog(true);
               }}
            >
               刪除
            </button>
            <Checkbox
               sx={{
                  marginRight: "10px",
                  color: "white",
                  "&.Mui-checked": {
                     color: green[600],
                  },
               }}
               className={cls("checkbox")}
               checked={todoListData.completed}
               disabled={false}
               onChange={(e) => {
                  onToggle(todoListData.id, e.target.checked);
               }}
            ></Checkbox>

            <FormDialog
               isShow={isShowUpdateDialog}
               data={selectData}
               onClose={(data) => {
                  setIsShowUpdateDialog(false);
                  if (data != null) {
                     onUpdate(data);
                  }
               }}
            ></FormDialog>

            <DeleteDialog
               isShow={isShowDeleteDialog}
               data={selectData}
               onClose={(isDelete) => {
                  if (isDelete) {
                     setIsShowDeleteDialog(false);
                     onDelete(selectData.id);
                  }
               }}
            ></DeleteDialog>
         </div>
      );
   }
);

// 在主组件中使用
function TodoDataList(props) {
   useListener("isShowAddDialogCallBack", (data) => {
      addTodoItem(data);
   });

   const [todoListDatas, setTodoListDatas] = useState([]);
   // 更新单个项目
   const updateTodoItem = useCallback((data) => {
      setTodoListDatas((prevDatas) =>
         prevDatas.map((item) => {
            if (item.id === data.id) {
               if (data.type === "userId") {
                  return { ...item, userId: data.content };
               } else if (data.type === "content") {
                  return { ...item, title: data.content };
               }
            }
            return item;
         })
      );
   }, []);

   // 删除项目
   const deleteTodoItem = useCallback((id) => {
      setTodoListDatas((prevDatas) =>
         prevDatas.filter((item) => item.id !== id)
      );
   }, []);

   // 添加项目
   const addTodoItem = useCallback((data) => {
      setTodoListDatas((prevDatas) => {
         const maxId =
            prevDatas.length > 0
               ? Math.max(...prevDatas.map((item) => item.id))
               : 0;
         const newId = maxId + 1;

         const newData = {
            ...data,
            id: newId,
            completed: false,
         };

         return [newData, ...prevDatas];
      });
   }, []);

   // 切换完成状态
   const toggleTodoItem = useCallback((id, completed) => {
      setTodoListDatas((prevDatas) =>
         prevDatas.map((item) =>
            item.id === id ? { ...item, completed } : item
         )
      );
   }, []);

   function getTodoListData() {
      axios
         .get("https://jsonplaceholder.typicode.com/todos")
         .then((data) => {
            setTodoListDatas(data.data);
         })
         .catch((e) => {
            console.log(e);
         });
   }

   useEffect(() => {
      getTodoListData();
   }, []);

   return (
      <div>
         {todoListDatas.map((todoListData) => (
            <TodoItem
               key={todoListData.id}
               todoListData={todoListData}
               onUpdate={updateTodoItem}
               onDelete={deleteTodoItem}
               onToggle={toggleTodoItem}
               onAdd={addTodoItem}
            />
         ))}
      </div>
   );
}
export default TodoDataList;
