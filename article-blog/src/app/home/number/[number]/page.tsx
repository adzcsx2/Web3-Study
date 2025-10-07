export default function Number({ params }: { params: { number: string } }) {
   return (
      <div>
         <h1>Number {params.number}</h1>
      </div>
   );
}
