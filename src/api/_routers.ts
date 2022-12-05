import CreateUserRouter from "./createuser";
import IsAcceptable from "./isacceptable";
import RouteName from "./routename";
import ReqRoute from "./reqroute";
import ReqPassable from "./reqpassable";
import Astar from "./astar";
import ExecRoute from "./execroute";
import SaveRoute from "./saveroute";
import MonitorCar from "./monitorcar";
import EndRoute from "./endroute";
import Terminate from "../terminate";
import ProceedRoute from "./proceedroute";
import CommunicateCar from "./communicatecar";
import LoginAdmin from "./admin/loginadmin";
import ChangePasswd from "./admin/changePasswd";
import ReqPassAdmin from "./admin/reqpassadmin";
import ReqCarInfo from "./admin/reqcarinfo";
import AddPassPoint from "./admin/addpasspoint";
import DelPassPoint from "./admin/delpasspoint";
import TerminateAdmin from "./admin/terminateadmin";

export default [
  CreateUserRouter,
  IsAcceptable,
  RouteName,
  ReqRoute,
  ReqPassable,
  Astar,
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
];
