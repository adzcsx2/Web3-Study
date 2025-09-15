import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";
import TextField from "@mui/material/TextField";
import { Provider as BusProvider, useBus, useListener } from "react-bus";
import { DialogContent } from "@mui/material";
export function AddDialog(props) {
   const [data, setData] = React.useState({ userId: "", title: "" });
   const [isShow, setIsShow] = React.useState(false);
   const bus = useBus();
   useListener("isShowAddDialog", (data) => {
      console.log(data);
      setIsShow(data);
   });

   return (
      <div>
         <Dialog
            fullWidth={true}
            open={isShow}
            aria-labelledby="form-dialog-title"
         >
            <DialogContent>
               <div style={{ padding: "10px" }}>
                  <DialogContentText>UserId</DialogContentText>
                  <TextField
                     autoFocus
                     margin="dense"
                     id="userId"
                     fullWidth={true}
                     onChange={(e) => {
                        setData({ ...data, userId: e.target.value });
                     }}
                  />
               </div>
               <div style={{ padding: "10px" }}>
                  <DialogContentText>Content</DialogContentText>
                  <TextField
                     autoFocus
                     margin="dense"
                     id="content"
                     fullWidth={true}
                     onChange={(e) => {
                        setData({ ...data, title: e.target.value });
                     }}
                  />
               </div>

               <Button
                  style={{ width: "50%" }}
                  onClick={() => {
                     bus.emit("isShowAddDialog", false);
                  }}
                  color="primary"
               >
                  取消
               </Button>
               <Button
                  style={{ width: "50%" }}
                  onClick={() => {
                     bus.emit("isShowAddDialog", false);
                     bus.emit("isShowAddDialogCallBack", data);
                  }}
                  color="primary"
               >
                  保存
               </Button>
            </DialogContent>
         </Dialog>
      </div>
   );
}
