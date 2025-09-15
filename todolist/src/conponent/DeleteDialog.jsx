import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

export default function DeleteDialog(props) {
   return (
      <div>
         <Dialog
            open={props.isShow}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
         >
            <DialogTitle id="alert-dialog-title">
               {"是否删除当前数据?"}
            </DialogTitle>
            <DialogContent>
               <DialogContentText id="alert-dialog-description">
                  请注意,删除数据后将不能恢复.
               </DialogContentText>
            </DialogContent>
            <DialogActions>
               <Button
                  onClick={() => {
                     props.onClose(false);
                  }}
               >
                  取消
               </Button>
               <Button
                  onClick={() => {
                     props.onClose(true);
                  }}
                  autoFocus
               >
                  删除
               </Button>
            </DialogActions>
         </Dialog>
      </div>
   );
}
