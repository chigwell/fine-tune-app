import {
  columnsDataComplex,
} from "./variables/columnsData";
import tableDataComplex from "./variables/tableDataComplex.json";
import ComplexTable from "./components/ComplexTable";

const Files = () => {
  return (
    <div>
      <div className="mt-5 grid h-full grid-cols-1 gap-5">
        <ComplexTable
          columnsData={columnsDataComplex}
          tableData={tableDataComplex}
        />
      </div>
    </div>
  );
};

export default Files;
