import './App.css';
import axios, {Axios} from "axios";
import React, {useEffect, useState, Component} from "react";
import {confirm} from "react-confirm-box";
import {Button, Container, Dropdown, Form, Nav, Navbar, NavDropdown} from "react-bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';

import CustomPopup from "./CustomPopup";

function App() {
    const [view, setView] = useState(1);
    const [activeID, setActiveID] = useState();
    const [notes, setNotes] = useState([]);
    const [nonFilteredNotes, setNonFilteredNotes] = useState([]);
    const [validated, setValidated] = useState(false);
    const [loginStatus, setLoginStatus] = useState();
    const [formUsername, setFormUsername] = useState();
    const [formEmail, setFormEmail] = useState();
    const [formPassword, setFormPassword] = useState();
    const [formPasswordConfirm, setFormPasswordConfirm] = useState();
    const [formNewPassword, setFormNewPassword] = useState();
    const [formNewPasswordConfirm, setFormNewPasswordConfirm] = useState();
    const [username, setUsername] = useState();
    const [title, setTitle] = useState();
    const [content, setContent] = useState();
    const [passwordChangePopupVisibility, setPasswordChangePopupVisibility] = useState(false);
    const [accountDeletionPopupVisibility, setAccountDeletionPopupVisibility] = useState(false);
    const [passwordsMatch, setPasswordsMatch] = useState(true);

    // Verifies login status on startup.
    function verify() {
        if (localStorage.getItem("accessToken")) {
            const data = {
                accessToken: localStorage.getItem("accessToken")
            }
            axios
                .post("http://localhost:8080/api/verify-login-status", data)
                .then(res => {
                    if (res.status == 202) {
                        setLoginStatus(true);
                        setUsername(res.data.username);
                        getNotes();
                    }
                })
                .catch(e => {
                    setLoginStatus(false);
                });
        } else {
            setLoginStatus(false);
        }
    }

    const getNotes = () => {
        const data = {
            "accessToken": localStorage.getItem("accessToken")
        }
        axios
            .post("http://localhost:8080/api/get-notes", data)
            .then(response => {
                setNotes(response.data.reverse());
                setNonFilteredNotes(response.data.reverse());
            })
    }

    useEffect(() => {
        verify();
    }, []);

    function trimNoteContent(content) {
        if (content.length > 250) {
            return content.substring(0, 247) + "...";
        } else {
            return content;
        }
    }

    function formatDate(date) {
        const jsDate = new Date(date);
        const day = jsDate.getDate();
        const month = jsDate.getMonth() + 1;
        const year = jsDate.getUTCFullYear();
        return day + "." + month + "." + year;
    }

    function searchNotes(event) {
        let filteredNotes = [];
        for (let i = 0; i < nonFilteredNotes.length; i++) {
            if (nonFilteredNotes[i].title.toLowerCase().includes(event.target.value.toLowerCase()) || nonFilteredNotes[i].note_content.toLowerCase().includes(event.target.value.toLowerCase())) {
                filteredNotes.push(nonFilteredNotes[i]);
            }
        }
        setNotes(filteredNotes);
    }

    function submitNewNote() {
        if (title.length && content.length) {
            const data = {
                "accessToken": localStorage.getItem("accessToken"),
                "title": title,
                "note_content": content
            }

            axios
                .post("http://localhost:8080/api/create-note", data)
                .then(response => {
                    if (response.status == 200) {
                        window.location.reload(false);
                    }
                })
                .catch(e => {
                    if (e.response.status == 403) {
                        alert("Login expired. Please log in again.");
                    } else {
                        alert(e.response.data.errors[0].msg);
                    }
                });
        }
    }

    function submitEditedNote() {
        if (title && content) {
            const data = {
                "accessToken": localStorage.getItem("accessToken"),
                "note_id": getNote().id,
                "note_title": title,
                "note_content": content
            }

            axios
                .post("http://localhost:8080/api/edit-note", data)
                .then(response => {
                    if (response.status == 200) {
                        window.location.reload(false);
                    }
                })
                .catch(e => {
                    if (e.response.status == 403) {
                        alert("Login expired. Please log in again.");
                    } else {
                        alert(e.response.data.errors[0].msg);
                    }
                })
        }
    }

    async function deleteNote() {
        const result = await confirm("Are you sure you want to delete this note?");

        if (result) {
            let data = {
                "accessToken": localStorage.getItem("accessToken"),
                "note_id": getNote().id
            }
            axios
                .post("http://localhost:8080/api/delete-note", data)
                .then(response => {
                    if (response.status == 200) {
                        window.location.reload(false);
                    }
                })
                .catch(e => {
                    if (e.response.status == 403) {
                        alert("Login expired. Please log in again.");
                    } else {
                        alert("Unknown error occured.");
                    }
                })
        }
    }

    // Used to get note contents based on currently active note ID.
    function getNote() {
        for (let i = 0; i < notes.length; i++) {
            if (notes[i].id == activeID) {
                return notes[i];
            }
        }
    }

    function register(event) {
        event.preventDefault();
        const form = event.currentTarget;
        if (form.checkValidity() === false) {
            event.stopPropagation();
        } else {
            if (formPassword == formPasswordConfirm) {
                setPasswordsMatch(true);

                let data = {
                    username: formUsername,
                    email: formEmail,
                    password: formPassword
                }
                axios
                    .post("http://localhost:8080/api/register", data)
                    .then(res => {
                        localStorage.setItem("accessToken", res.data.accessToken);
                        setLoginStatus(true);
                        setView(1);
                        verify();
                        window.location.reload();
                    })
                    .catch(e => {
                        setValidated(false);
                        alert(e.response.data.errors[0].msg);
                    });
            } else {
                setPasswordsMatch(false);
            }
        }
        setValidated(true);
    }

    function login(event) {
        event.preventDefault();
        const form = event.currentTarget;
        if (form.checkValidity() === false) {
            event.stopPropagation();
        } else {
            let data = {
                email: formEmail,
                password: formPassword
            }
            axios
                .post("http://localhost:8080/api/login", data)
                .then(res => {
                    localStorage.setItem("accessToken", res.data.accessToken);
                    setLoginStatus(true);
                    setView(1);
                    verify();
                    window.location.reload();
                    setValidated(false);
                })
                .catch(e => {
                    setValidated(false);
                    alert(e.response.data.errors[0].msg);
                });
        }
        //setValidated(true);
    }

    function logout() {
        localStorage.removeItem("accessToken");
        window.location.reload(false);
    }

    async function deleteAccount() {
        if (!formPassword.length) {
            alert("Password cannot be empty!");
        } else {
            const data = {
                "accessToken": localStorage.getItem("accessToken"),
                "password": formPassword
            }

            axios
                .post("http://localhost:8080/api/delete-account", data)
                .then(response => {
                    if (response.status == 200) {
                        localStorage.removeItem("accessToken");
                        window.location.reload(false);
                    }
                })
                .catch(e => {
                    if (e.response.status == 403) {
                        alert("Password incorrect or login expired.")
                    } else {
                        alert(e.response.data.errors[0].msg);
                    }
                })
        }
    }

    function popupCloseHandler() {
        setAccountDeletionPopupVisibility(false);
        setPasswordChangePopupVisibility(false);
        window.location.reload(false);
    }

    function changePassword(event) {
        event.preventDefault();
        const form = event.currentTarget;
        if (form.checkValidity() === false) {
            event.stopPropagation();
        } else {
            if (formNewPassword == formNewPasswordConfirm) {
                setPasswordsMatch(true);

                const data = {
                    "accessToken": localStorage.getItem("accessToken"),
                    "password": formPassword,
                    "newPassword": formNewPassword
                }

                axios
                    .post("http://localhost:8080/api/change-password", data)
                    .then(response => {
                        if (response.status == 200) {
                            alert("Password changed successfully.");
                            window.location.reload();
                        }
                    })
                    .catch(e => {
                        if (e.response.status == 403) {
                            alert("Password incorrect or login expired.")
                        }
                    });
            } else {
                setPasswordsMatch(false);
            }
        }
        setValidated(true);
    }

    return (<div className="App">
            <Navbar bg={"dark"} variant={"dark"}>
                <Container>
                    <Navbar.Brand id={"brand"} onClick={() => window.location.reload()}>Note App</Navbar.Brand>
                    <Nav className="ml-auto">
                        {loginStatus == false && (
                            <Container>
                                <p className={"loginLink"} onClick={() => setView(5)}>Login</p>
                            </Container>
                        )}
                        {loginStatus == true && (
                            <NavDropdown title={username} id="basic-nav-dropdown">
                                <NavDropdown.Item onClick={() => setPasswordChangePopupVisibility(true)}>Change
                                    password</NavDropdown.Item>
                                <NavDropdown.Item onClick={() => setAccountDeletionPopupVisibility(true)}>Delete
                                    Account</NavDropdown.Item>
                                <NavDropdown.Item onClick={() => logout()}>Log Out</NavDropdown.Item>
                            </NavDropdown>
                        )}
                    </Nav>
                </Container>
            </Navbar>

            <CustomPopup
                onClose={popupCloseHandler}
                show={passwordChangePopupVisibility}
                title="Change password"
            >
                <Form noValidate validated={validated} onSubmit={changePassword} className="mt-3">
                    <Form.Group className="mb-3">
                        <Form.Control type="password" placeholder={"Current password"}
                                      onInput={e => setFormPassword(e.target.value)} required
                                      minLength={8}
                                      maxLength={500}/>
                        <Form.Control.Feedback type="invalid">
                            Please enter a valid password. Passwords are between 8-500 characters.
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Control type="password" placeholder={"New password"}
                                      onInput={e => setFormNewPassword(e.target.value)}
                                      minLength={8}
                                      maxLength={500}
                                      required/>
                        <Form.Text className="text-muted">
                            New password must be at least 8 characters long.
                        </Form.Text>
                        <Form.Control.Feedback type="invalid">
                            Please enter a valid password
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Control type="password" placeholder={"Confirm new password"}
                                      onInput={e => {
                                          setFormNewPasswordConfirm(e.target.value);
                                      }}
                                      minLength={8}
                                      maxLength={500}
                                      required/>
                        <Form.Control.Feedback type="invalid">
                            Please enter a valid password
                        </Form.Control.Feedback>
                        {passwordsMatch == false && (
                            <p id={"pdmMessage"}>Passwords don't match!</p>
                        )}
                    </Form.Group>

                    <Button variant={"warning"} type="submit" className="me-2">Change</Button>
                    <Button variant={"secondary"} onClick={popupCloseHandler} className="ms-2">Cancel</Button>
                </Form>


            </CustomPopup>

            <CustomPopup
                onClose={popupCloseHandler}
                show={accountDeletionPopupVisibility}
                title="Delete account?"
            >
                <p>All data will be erased. You can reuse your current email to create a new account if you wish to.</p>
                <Form noValidate>
                    <Form.Control type="password" placeholder={"Password"}
                                  onInput={e => setFormPassword(e.target.value)}
                                  className="mb-3"
                                  maxValue={500}/>
                </Form>
                <div className={"buttonDiv"}>
                    <Button className={"popupButton"} variant={"danger"} onClick={deleteAccount}
                            className="me-2">Delete</Button>
                    <Button className={"popupButton"} variant={"secondary"} onClick={popupCloseHandler}
                            className="ms-2">Cancel</Button>
                </div>
            </CustomPopup>

            {view == 1 && (
                // home view
                <div className={"contentDiv"}>

                    {loginStatus == true && (
                        <div>
                            <div className={"homeTopDiv"}>
                                <input type="search" onChange={searchNotes} className={"searchBar"}
                                       placeholder={"Search..."}/>
                                <Button variant="primary" onClick={() => {
                                    setView(2);
                                }}>New
                                </Button>
                            </div>
                            <div>
                                <table>
                                    {notes.length > 0 && (
                                        <tbody>
                                        {notes.map(note => (
                                            <tr>
                                                <td>
                                                    <div className={"noteDiv"} onClick={() => {
                                                        setView(3);
                                                        setActiveID(note.id);
                                                    }}>
                                                        <div className={"titleDiv"}>
                                                            {note.title}
                                                        </div>
                                                        <div className={"noteContentDiv"}>
                                                            {trimNoteContent(note.note_content)}
                                                        </div>
                                                        <div className={"dateDiv"}>
                                                            {formatDate(note.date_modified)}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    )}
                                </table>
                                {notes.length <= 0 && (
                                    <div className={"noNotesDiv"}><p>No notes found! :(</p></div>
                                )}
                            </div>
                        </div>
                    )}
                    {loginStatus == false && (
                        <div>
                            <p id={"notLoggedInText"}>Log in or create an account to start taking notes!</p>
                        </div>
                    )}
                </div>
            )}
            {view == 2 && (
                // note creation view
                <div className={"contentDiv"}>
                    <div className={"noteEditorDiv"}>
                        <input type="text" placeholder={"Title"} onInput={e => setTitle(e.target.value)}
                               maxLength={"100"}/>
                        <textarea onInput={e => setContent(e.target.value)} id="" cols="30" rows="10"
                                  placeholder={"Content"} maxLength={"10000"}></textarea>
                        <Button variant="primary" onClick={submitNewNote} disabled={!title || !content}>Save</Button>
                        <Button variant="secondary" onClick={() => {
                            setView(1);
                            setTitle();
                            setContent();
                        }}
                                className={"cancelButton"}>Cancel</Button>
                    </div>
                </div>
            )}
            {view == 3 && (
                // Full note view
                <div className={"contentDiv"}>
                    <div className={"backButtonDiv"}>
                        <Button variant="secondary" className={"backButton"} onClick={() => setView(1)}>Back</Button>
                        <Button variant="danger" className={"deleteButton"} onClick={() => deleteNote()}>Delete</Button>
                        <Button className={"editButton"} onClick={async () => {
                            setTitle(getNote().title);
                            setContent(getNote().note_content);
                            setView(4);
                        }}>Edit</Button>
                    </div>
                    <div className={"fullNoteDiv"}>
                        <h1>{getNote().title}</h1>
                        <p>Last modified: {formatDate(getNote().date_modified)}</p>
                        <p>{getNote().note_content}</p>
                    </div>
                </div>
            )}

            {view == 4 && (
                // note editing view
                <div className={"contentDiv"}>
                    <div className={"noteEditorDiv"}>
                        <input type="text" placeholder={"Title"} defaultValue={getNote(activeID).title}
                               onInput={e => setTitle(e.target.value)} maxlength={"100"}/>
                        <textarea onInput={e => setContent(e.target.value)} placeholder={"Content"}
                                  defaultValue={getNote(activeID).note_content} maxlength={"10000"}></textarea>
                        <Button variant="primary" onClick={() => submitEditedNote()}
                                disabled={!title || !content}>Save</Button>
                        <Button variant="secondary" onClick={() => setView(1)}
                                className={"cancelButton"}>Cancel</Button>
                        <Button variant="danger" onClick={() => deleteNote()}
                                className={"deleteButton me-3"}>Delete</Button>
                    </div>
                </div>
            )}

            {view == 5 && (
                // login div
                <div className={"contentDiv"}>
                    <Form noValidate validated={validated} onSubmit={login}>
                        <Form.Group className="mb-3" controlId="formBasicEmail" required>
                            <Form.Label>Email address</Form.Label>
                            <Form.Control type="email" placeholder="Email" onInput={e => setFormEmail(e.target.value)}/>
                            <Form.Control.Feedback type="invalid">
                                Please enter a valid email address.
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formBasicPassword">
                            <Form.Label>Password</Form.Label>
                            <Form.Control type="password" placeholder="Password" required minLength={8}
                                          maxLength={500}
                                          onInput={e => setFormPassword(e.target.value)}/>
                            <Form.Control.Feedback type="invalid">
                                Please enter a valid password. Passwords must be at least 8 characters.
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Button variant="primary" type="submit">
                            Login
                        </Button>
                    </Form>
                    <p className={"registerationLink"} onClick={() => setView(6)}>New user? Register here.</p>
                </div>
            )}

            {view == 6 && (
                // register div

                <div className={"contentDiv"}>
                    <Form noValidate validated={validated} onSubmit={register}>
                        <Form.Group className="mb-3" controlId="formBasicUsername" required>
                            <Form.Label>Username</Form.Label>
                            <Form.Control type="text" placeholder="Username"
                                          onInput={e => setFormUsername(e.target.value)}
                                          minLength={1}
                                          maxLength={50}/>
                            <Form.Control.Feedback type="invalid">
                                Please enter a valid username.
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formBasicEmail" required>
                            <Form.Label>Email address</Form.Label>
                            <Form.Control type="email" placeholder="Email" onInput={e => setFormEmail(e.target.value)}/>
                            <Form.Control.Feedback type="invalid">
                                Please enter a valid email address.
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formBasicPassword">
                            <Form.Label>Password</Form.Label>
                            <Form.Control type="password" placeholder="Password" required minLength={8} maxLength={500}
                                          onInput={e => setFormPassword(e.target.value)}/>
                            <Form.Text className="text-muted">
                                Password must be at least 8 characters.
                            </Form.Text>
                            <Form.Control.Feedback type="invalid">
                                Please enter a valid password.
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formBasicPassword">
                            <Form.Label>Confirm password</Form.Label>
                            <Form.Control type="password" placeholder="Confirm password" required minLength={8}
                                          maxLength={500}
                                          onInput={e => setFormPasswordConfirm(e.target.value)}/>
                            <Form.Control.Feedback type="invalid">
                                Please enter a valid password.
                            </Form.Control.Feedback>
                            {passwordsMatch == false && (
                                <p id={"pdmMessage"}>Passwords don't match!</p>
                            )}
                        </Form.Group>

                        <Button variant="primary" type="submit">
                            Register
                        </Button>
                    </Form>
                </div>
            )}
        </div>
    );
}

export default App;
