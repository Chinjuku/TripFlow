import expenses from './expenses.json';
import settlements from './settlements.json';
import monitoring from './monitoring.json';
import dashboard from './dashboard.json';
import centralFund from './central-fund.json';

const finances = {
  ...dashboard,
  ...expenses,
  ...settlements,
  ...monitoring,
  ...centralFund
};

export default finances;
