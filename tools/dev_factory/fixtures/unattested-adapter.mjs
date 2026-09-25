const studio={
  async call(){
    throw new Error('unattested CI adapter must never reach Studio tools');
  }
};

const agents={
  async plan(){
    throw new Error('unattested CI adapter must never reach planner');
  },
  async code(){
    throw new Error('unattested CI adapter must never reach coder');
  },
  async review(){
    throw new Error('unattested CI adapter must never reach reviewer');
  }
};

export default {studio,agents};
