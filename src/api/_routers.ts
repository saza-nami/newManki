import CreateUserRouter from "api/createuser";
import IsAcceptable from "api/isacceptable";
import RouteName from "api/routename";
import ReqRoute from "api/reqroute";
import ReqPassable from "api/reqpassable";
import ExecRoute from "api/execroute";
import SaveRoute from "api/saveroute";
import MonitorCar from "api/monitorcar";
import EndRoute from "api/endroute";
import Terminate from "api/terminate";
import ProceedRoute from "api/proceedroute";
import CommunicateCar from "api/communicatecar";
import LoginAdmin from "api/admin/loginadmin";
import ChangePasswd from "api/admin/changePasswd";
import ReqPassAdmin from "api/admin/reqpassadmin";
import ReqCarInfo from "api/admin/reqcarinfo";
import AddPassPoint from "api/admin/addpasspoint";
import DelPassPoint from "api/admin/delpasspoint";
import TerminateAdmin from "api/admin/terminateadmin";
import ThreadAstar from "api/astar/threadastar";

export default [
  CreateUserRouter,
  IsAcceptable,
  RouteName,
  ReqRoute,
  ReqPassable,
  ExecRoute,
  SaveRoute,
  MonitorCar,
  EndRoute,
  Terminate,
  ProceedRoute,
  CommunicateCar,
  LoginAdmin,
  ChangePasswd,
  ReqPassAdmin,
  ReqCarInfo,
  AddPassPoint,
  DelPassPoint,
  TerminateAdmin,
  ThreadAstar,
];
