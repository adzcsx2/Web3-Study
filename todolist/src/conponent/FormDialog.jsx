import React from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";

export default function FormDialog(props) {
   const [_input, setInput] = React.useState("");

 
   function contentText() {
      if (props.data.type === "userId") {
         return (
            <div style={{ padding: "10px" }}>
               <DialogContentText>修改UserId</DialogContentText>
               <TextField
                  autoFocus
                  margin="dense"
                  id="userId"
                  defaultValue={props.data.content}
                  fullWidth={true}
                  onChange={(e) => {
                     setInput(e.target.value);
                  }}
               />
            </div>
         );
      } else if (props.data.type === "content") {
         return (
            <div style={{ padding: "10px" }}>
               <DialogContentText>修改内容</DialogContentText>
               <TextField
                  autoFocus
                  margin="dense"
                  id="content"
                  defaultValue={props.data.content}
                  fullWidth={true}
                  onChange={(e) => {
                     setInput(e.target.value);
                  }}
               />
            </div>
         );
      }
   }

   return (
      <div>
         <Dialog
            fullWidth={true}
            open={props.isShow}
            onClose={props.onCLose}
            aria-labelledby="form-dialog-title"
         >
            {contentText()}
            <DialogActions>
               <Button
                  onClick={() => {
                     props.onClose(null);
                  }}
                  color="primary"
               >
                  取消
               </Button>
               <Button
                  onClick={() => {
                     props.onClose({
                        content: _input,
                        type: props.data.type,
                        id: props.data.id,
                     });
                  }}
                  color="primary"
               >
                  保存
               </Button>
            </DialogActions>
         </Dialog>
      </div>
   );
}
