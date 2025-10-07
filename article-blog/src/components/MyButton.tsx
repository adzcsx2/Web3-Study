export default function MyButton({
   children,
   onClick,
}: {
   children: string;
   onClick?: () => void;
}) {
   return (
      <button
         onClick={onClick}
         className="bg-blue-500 p-5 rounded-md text-white "
      >
         {children}
      </button>
   );
}
