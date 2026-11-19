const Pager = ({ page, pages, onChange }) =>
  pages <= 1 ? null : (
    <div className="pager">
      <button className="btn btn-outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span>Page {page} of {pages}</span>
      <button className="btn btn-outline" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
export default Pager;
